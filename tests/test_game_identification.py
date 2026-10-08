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

    def test_cex_search_uses_game_title_not_console_alias_or_unboxed_grade(self):
        hit={"boxName":"Silent Hill 2 (PS2)","boxId":"SH2PS2",
             "categoryName":"Playstation 2 Games","sellPrice":70}
        query="Silent Hill 2 PS2"
        intent=server.infer_intent(query)
        with patch.object(server, "urlopen", return_value=FakeResponse({
            "results":[{"hits":[hit]}]
        })) as fake:
            result=server.cex_search(query,intent,grade="Unboxed")
        self.assertTrue(result["ok"],result)
        payload=json.loads(fake.call_args.args[0].data)
        params=payload["requests"][0]["params"]
        from urllib.parse import parse_qs
        searched=parse_qs(params)["query"][0]
        self.assertEqual(searched,query)
        self.assertNotIn("Console",searched)
        self.assertNotIn("Unboxed",searched)


if __name__=="__main__":
    unittest.main()
