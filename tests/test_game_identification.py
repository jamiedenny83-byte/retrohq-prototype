"""Regression tests: game titles must not be mistaken for console hardware."""
import os
import json
import unittest
from unittest.mock import patch

import server


class FakeResponse:
    def __init__(self, payload):
        self.body = json.dumps(payload).encode("utf-8")
    def __enter__(self):
        return self
    def __exit__(self, *_):
        return False
    def read(self):
        return self.body


class GameIdentificationTests(unittest.TestCase):
    def test_game_titles_are_software_not_hardware(self):
        samples = (
            ("Silent Hill 2 PS2", "PlayStation 2", "silent hill 2"),
            ("PS2 Silent Hill 2", "PlayStation 2", "silent hill 2"),
            ("Pokémon Emerald GBA", "Game Boy Advance", "pok mon emerald"),
            ("God of War PS3", "PlayStation 3", "god of war"),
            ("Halo 2 Xbox 360", "Xbox 360", "halo 2"),
        )
        for q, platform, _ in samples:
            with self.subTest(query=q):
                intent = server.infer_intent(q)
                self.assertEqual(intent["type"], "software", intent)
                self.assertEqual(intent["platform"], platform)

    def test_console_queries_remain_hardware(self):
        for query, platform in (
            ("PS3 Slim 320GB Scarlet Red", "PlayStation 3"),
            ("PS2", "PlayStation 2"),
            ("PlayStation 2 System", "PlayStation 2"),
            ("Xbox 360 Elite 250GB", "Xbox 360"),
            ("GBA handheld", "Game Boy Advance"),
        ):
            with self.subTest(query=query):
                intent = server.infer_intent(query)
                self.assertEqual(intent["type"], "hardware", intent)
                self.assertEqual(intent["platform"], platform)

    def test_pricecharting_filters_console_hardware_and_other_game_platforms(self):
        intent = server.infer_intent("Silent Hill 2 PS2")
        self.assertEqual(intent["gameTitle"], "silent hill 2")
        responses = [
            {"id": "system-slim", "product-name": "Slim Playstation 2 System", "console-name": "Playstation 2"},
            {"id": "system", "product-name": "Playstation 2 System", "console-name": "Playstation 2"},
            {"id": "game-pal", "product-name": "Silent Hill 2", "console-name": "PAL Playstation 2"},
            {"id": "game-us", "product-name": "Silent Hill 2", "console-name": "Playstation 2"},
            {"id": "game-ps3", "product-name": "Silent Hill 2", "console-name": "Playstation 3"},
            {"id": "game-other", "product-name": "Silent Hill 3", "console-name": "Playstation 2"},
        ]
        with patch.object(server, "pc_call", return_value={"status": "success", "products": responses}) as call:
            ranked, errors = server.pc_candidates_for("Silent Hill 2 PS2", intent)
        self.assertFalse(errors)
        self.assertEqual({x["id"] for x in ranked}, {"game-pal","game-us"})
        self.assertEqual(ranked[0]["id"], "game-pal")
        self.assertEqual(call.call_args_list[0].args[1]["q"], "silent hill 2")

    def test_buy_check_returns_games_for_confirmation(self):
        responses = [
            {"id": "console", "product-name": "Slim Playstation 2 System", "console-name": "Playstation 2"},
            {"id": "pal", "product-name": "Silent Hill 2", "console-name": "PAL Playstation 2"},
            {"id": "usa", "product-name": "Silent Hill 2", "console-name": "Playstation 2"},
        ]
        with patch.dict(os.environ, {"PRICECHARTING_API_TOKEN": "fake-token"}), \
             patch.object(server, "pc_call", return_value={"status": "success", "products": responses}):
            result=server.pricecharting_lookup("Silent Hill 2 PS2", "")
        self.assertEqual(result["mode"], "candidates")
        self.assertEqual({c["id"] for c in result["candidates"]}, {"pal","usa"})

    def test_selecting_game_cannot_resolve_to_hardware(self):
        with patch.object(server, "pc_detail", return_value={
            "ok":True,"product":"Slim Playstation 2 System","console":"Playstation 2",
            "prices":{},"genre":"Systems",
        }):
            result=server.pricecharting_lookup("Silent Hill 2 PS2", "", selected_id="console")
        self.assertEqual(result["mode"], "error")
        self.assertEqual(result["result"]["status"], "Rejected mismatched edition")

        with patch.object(server, "pc_detail", return_value={
            "ok":True,"product":"Silent Hill 2","console":"PAL Playstation 2",
            "prices":{},"genre":"Games",
        }):
            result=server.pricecharting_lookup("Silent Hill 2 PS2", "", selected_id="pal")
        self.assertEqual(result["mode"], "matched")
        self.assertEqual(result["intent"]["type"], "software")

    def test_cex_catalogue_platform_labels_preserve_exact_platform(self):
        # CeX sometimes reports category slugs without a space before the generation.
        self.assertEqual(server._cex_platforms("Silent Hill 2 playstation2-software"),
                         {"PlayStation 2"})
        self.assertEqual(server._cex_platforms("Silent Hill 2 PS2 Games"),
                         {"PlayStation 2"})
        self.assertEqual(server._cex_platforms("Silent Hill 2"),set())
        self.assertEqual(server._cex_platforms("playstation3-software"),
                         {"PlayStation 3"})

    def test_cex_ps2_game_search_matches_catalogue_slug_but_rejects_ps3(self):
        query="Silent Hill 2 PS2"
        intent=server.infer_intent(query)
        identity=server.canonical_identity(query,{
            "product":"Silent Hill 2","console":"PAL Playstation 2"
        },intent)
        hits=[
            {"boxName":"Silent Hill 2","categoryName":"playstation2-software",
             "boxId":"SH2_PS2","sellPrice":99,"cashPriceCalculated":35,
             "exchangePriceCalculated":50},
            {"boxName":"Silent Hill 2","categoryName":"playstation3-software",
             "boxId":"SH2_PS3","sellPrice":55},
            {"boxName":"Silent Hill 3","categoryName":"playstation2-software",
             "boxId":"SH3_PS2","sellPrice":77},
        ]
        with patch.object(server,"urlopen",return_value=FakeResponse({
            "results":[{"hits":hits}]
        })):
            match=server.cex_search(query,intent,grade="Unboxed",identity=identity)
        self.assertFalse(match["ok"],match)
        self.assertEqual(match["status"],"CeX variant needed")
        self.assertEqual(len(match["variants"]),1)
        self.assertEqual(match["variants"][0]["productId"],"SH2_PS2")
        self.assertEqual(match["variants"][0]["cash"],35)
        self.assertEqual(match["variants"][0]["voucher"],50)

        with patch.object(server,"cex_detail",return_value=hits[0]):
            selected=server.cex_search(query,intent,grade="Unboxed",
                                       identity=identity,selected_product_id="SH2_PS2")
        self.assertTrue(selected["ok"],selected)
        self.assertEqual(selected["retail"],99)
        self.assertTrue(selected["selectedByUser"])

    def test_cex_search_uses_game_title_not_console_alias_or_unboxed_grade(self):
        hit={"boxName":"Silent Hill 2 (PS2)","boxId":"SH2PS2",
             "categoryName":"Playstation 2 Games","sellPrice":70}
        query="Silent Hill 2 PS2"
        intent=server.infer_intent(query)
        with patch.object(server, "urlopen", return_value=FakeResponse({
            "results":[{"hits":[hit]}]
        })) as fake:
            result=server.cex_search(query,intent,grade="Unboxed")
        self.assertFalse(result["ok"], result)
        self.assertEqual(result["status"], "CeX variant needed")
        self.assertEqual(result["variants"][0]["product"], "Silent Hill 2 (PS2)")
        payload=json.loads(fake.call_args.args[0].data)
        params=payload["requests"][0]["params"]
        from urllib.parse import parse_qs
        searched=parse_qs(params)["query"][0]
        self.assertEqual(searched,"silent hill 2")
        self.assertNotIn("Console",searched)
        self.assertNotIn("Unboxed",searched)

    def test_confirmed_game_cex_variant_loads_gbp_retail(self):
        query="Silent Hill 2 PS2"
        intent=server.infer_intent(query)
        detail={"boxName":"Silent Hill 2 (PS2)","boxId":"SH2PS2",
                "categoryName":"Playstation 2 Games","sellPrice":95,
                "cashPriceCalculated":39,"exchangePriceCalculated":55}
        with patch.object(server,"cex_detail", return_value=detail):
            result=server.cex_search(query,intent,grade="Boxed",
                                     identity=server.canonical_identity(query,{
                                         "product":"Silent Hill 2","console":"PAL Playstation 2"
                                     },intent),selected_product_id="SH2PS2")
        self.assertTrue(result["ok"],result)
        self.assertEqual(result["productId"],"SH2PS2")
        self.assertEqual(result["retail"],95)
        self.assertEqual(result["cash"],39)
        self.assertEqual(result["voucher"],55)
        self.assertTrue(result["selectedByUser"])

    def test_buy_check_keeps_pricecharting_and_cex_status_when_uk_price_pending(self):
        from urllib.parse import urlencode
        from urllib.request import urlopen
        from http.server import ThreadingHTTPServer
        import threading
        httpd=ThreadingHTTPServer(("127.0.0.1",0),server.H)
        worker=threading.Thread(target=httpd.serve_forever,daemon=True)
        worker.start()
        self.addCleanup(httpd.server_close)
        self.addCleanup(httpd.shutdown)
        base="http://127.0.0.1:{}".format(httpd.server_port)
        sample={
            "ok":True,"id":123,"product":"Silent Hill 2",
            "console":"PAL Playstation 2","genre":"Games","upc":None,
            "salesVolume":200,
            "prices":{"loose-price":45.2,"cib-price":71.5,"new-price":None}
        }
        variant={"ok":False,"status":"CeX variant needed","detail":"Confirm edition",
                 "variants":[{"productId":"SH2PS2","product":"Silent Hill 2 (PS2)",
                              "retail":95,"cash":39,"voucher":55}]}
        with patch.object(server,"pc_detail",return_value=sample), \
             patch.object(server,"cex_search",return_value=variant), \
             patch.object(server,"ebay_browse_search",return_value={
                 "ok":True,"environment":"sandbox","count":0,"items":[],
                 "total":0,"medianAsking":None,"lowAsking":None,"highAsking":None}):
            with urlopen(base+"/api/market-search?"+urlencode({
                "q":"Silent Hill 2 PS2","id":"123","cexGrade":"Boxed"
            }), timeout=5) as response:
                data=json.loads(response.read())
        self.assertIsNone(data["marketValue"])
        self.assertEqual(data["lockedIdentity"]["type"],"software")
        self.assertEqual(data["lockedIdentity"]["confirmedProduct"],"Silent Hill 2")
        price=next(x for x in data["evidence"] if x["provider"]=="PriceCharting")
        self.assertEqual(price["status"],"Live")
        self.assertEqual(price["prices"]["cib-price"],71.5)
        cex=next(x for x in data["evidence"] if x["provider"]=="CeX UK")
        self.assertEqual(cex["status"],"CeX variant needed")
        self.assertEqual(cex["variants"][0]["retail"],95)

    def test_pricecharting_reference_prices_appear_outside_collapsed_explanation(self):
        from pathlib import Path
        script=(Path(__file__).resolve().parent.parent/"app.js").read_text()
        self.assertIn("const priceReference=pcRecord?",script)
        self.assertIn("moneyUSD(pcPrice[key])",script)
        self.assertIn("${priceReference}${cexPrices}${cexPrompt}",script)
        self.assertIn("Game identified. There is no confirmed UK selling value yet",script)


if __name__=="__main__":
    unittest.main()
