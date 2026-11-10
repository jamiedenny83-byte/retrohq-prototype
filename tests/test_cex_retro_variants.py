import json
import unittest
from unittest.mock import patch
import server

class Response:
    def __init__(self,data):self.data=json.dumps(data).encode()
    def __enter__(self):return self
    def __exit__(self,*args):return False
    def read(self):return self.data

def hit(title,pid,category='GBA Software Gameboy Advance Software'):
    return {'boxName':title,'boxId':pid,'categoryName':category,'sellPrice':40,'cashPriceCalculated':15,'exchangePriceCalculated':20}

class RetroVariantTests(unittest.TestCase):
    def test_query_and_catalogue_share_platform_labels(self):
        for query,label,category in [
            ("Mario Kart 8 Deluxe Switch","Nintendo Switch","Nintendo Switch Software"),
            ("Resident Evil 2 N64","Nintendo 64","Nintendo64 Software"),
            ("Sonic Adventure Dreamcast","Dreamcast","Dreamcast Software"),
            ("Mario Kart DS","Nintendo DS","Nintendo DS Software"),
            ("Super Mario 3DS","Nintendo 3DS","Nintendo 3 DS Software"),
        ]:
            with self.subTest(query=query):
                self.assertEqual(server.infer_intent(query)["platform"],label)
                self.assertEqual(server._cex_platforms(category),{label})
        intent=server.infer_intent("Mario Kart DS")
        self.assertIsNotNone(server._cex_candidate_score("Mario Kart DS","Nintendo DS Software","Mario Kart",intent,{}))
        self.assertIsNone(server._cex_candidate_score("Mario Kart 7","Nintendo 3DS Software","Mario Kart",intent,{}))

    def test_buzzer_bundle_is_a_variant_not_a_different_game(self):
        rows=[hit("Disney Think Fast (No Buzzers)","LOOSE","Playstation2 Software"),
              hit("Disney Think Fast + Buzz Buzzers","BUNDLE","Playstation2 Software"),
              hit("Disney Think Fast","WII","Wii Software"),
              hit("Disney Think Fast 2 + Buzz Buzzers","SEQUEL","Playstation2 Software")]
        with patch.object(server,"urlopen",return_value=Response({"results":[{"hits":rows}]})),patch.object(server.time,"sleep"):
            variants=server.cex_search("Disney Think Fast PS2")["variants"]
            self.assertEqual({v["grade"] for v in variants},{"With buzzers","Without buzzers"})
            result=server.cex_search("PS2 PlayStation 2 Disney Think Fast Game + Buzzers Sealed")
            self.assertEqual([v["productId"] for v in result["variants"]],["BUNDLE"])
        with patch.object(server,"cex_detail",return_value=rows[0]):
            self.assertFalse(server.cex_search("Disney Think Fast PS2 with buzzers",selected_product_id="LOOSE")["ok"])

    def test_imported_title_cleanup_and_unknown_products(self):
        self.assertEqual(server.infer_intent("STARWING Nintendo Super NES SNES SuperFX PAL CIB Boxed w/ Manual")["gameTitle"],"starwing")
        self.assertEqual(server.infer_intent("Disney Pixar The Incredibles PS2 PAL w/ Manual THQ PEGI 7 2004 SLES-52812")["gameTitle"],"the incredibles")
        with patch.object(server,"urlopen") as request:
            result=server.cex_search("WowWee Homersapien")
            self.assertFalse(result["ok"])
            request.assert_not_called()

    def test_no_results_and_rejected_candidates_are_separate(self):
        q="Silent Hill 2 PS2"
        rows=[hit("Silent Hill 2 Promo","RELATED","Playstation2 Software"),
              hit("Silent Hill 3","SEQUEL","Playstation2 Software"),
              hit("Silent Hill 2","WRONG","Playstation5 Software")]
        with patch.object(server.time,"sleep"),patch.object(server,"urlopen",return_value=Response({"results":[{"hits":rows}]})):
            result=server.cex_search(q)
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"],"No confident CeX match")
        self.assertEqual(result["suggestions"],[{"product":"Silent Hill 2 Promo","query":"silent hill 2 promo PlayStation 2"}])
        with patch.object(server.time,"sleep"),patch.object(server,"urlopen",return_value=Response({"results":[{"hits":[]}]})):
            self.assertEqual(server.cex_search(q)["status"],"No CeX catalogue results")

    def test_super_nes_catalogue_matches_snes_without_accepting_nes(self):
        query='Starwing SNES Super Nintendo Game boxed'
        intent=server.infer_intent(query)
        self.assertEqual((intent['type'],intent['platform'],intent['gameTitle']),('software','SNES','starwing'))
        rows=[hit('Starwing, Unboxed','SNES-C','Super NES Software 1037 Gaming'),
              hit('Starwing, w/ Manual, Boxed','SNES-B','Super NES Software 1037 Gaming'),
              hit('Starwing, Unboxed','WRONG','NES Software'),
              hit('Starwing 2, Boxed','WRONG-TITLE','Super NES Software')]
        with patch.object(server,'urlopen',return_value=Response({'results':[{'hits':rows}]})):
            matches=server.cex_search(query,intent)
        self.assertEqual({row['productId'] for row in matches['variants']},{'SNES-C','SNES-B'})
        with patch.object(server,'cex_detail',return_value=rows[1]):
            quote=server.cex_search(query,intent,selected_product_id='SNES-B')
        self.assertEqual((quote['retail'],quote['cash'],quote['voucher']),(40,15,20))

    def test_listing_grade_after_platform_does_not_remove_title_words_or_change_hardware(self):
        self.assertEqual(server.infer_intent('Boxed In PS4 Game Unboxed')['gameTitle'],'boxed in')
        self.assertEqual(server.infer_intent('SNES Boxed')['type'],'hardware')

    def test_listing_descriptions_keep_exact_title_and_platform(self):
        examples=[
            'Starwing SNES Super Nintendo Game PAL Version Complete Boxed w. Inserts & Manual',
            'Starwing SNES Super Nintendo Pal Cartridge Only',
            'STARWING SUPER NINTENDO / SNES GAME * BOXED WITH MANUAL * VGC *',
            'Starwing SNES Super Nintendo UK PAL Boxed Manual Game',
        ]
        for query in examples:
            with self.subTest(query=query):
                intent=server.infer_intent(query)
                self.assertEqual((intent['gameTitle'],intent['platform']),('starwing','SNES'))
        special=server.infer_intent("Silent Hill 2 Director's Cut PS2 Boxed with Manual")
        self.assertEqual(special['gameTitle'],'silent hill 2 director s cut')

    def test_krazy_racers_shows_all_exact_completeness_variants_regardless_of_console_grade(self):
        rows=[hit('Konami Krazy Racers, '+suffix,str(n)) for n,suffix in enumerate(['Unboxed','w/o Manual, Boxed','w/ Manual, Boxed','Mint'])]
        for grade in ['Unboxed','Boxed',None]:
            with patch.object(server,'urlopen',return_value=Response({'results':[{'hits':rows}]})):
                result=server.cex_search('Krazy Racers GBA',server.infer_intent('Krazy Racers GBA'),grade=grade)
            self.assertEqual(result.get('status'),'CeX variant needed',result)
            self.assertEqual({x['productId']for x in result['variants']},{'0','1','2','3'})

    def test_ps2_packaging_variants_remain_explicit_and_do_not_hide_standard_case(self):
        names=['Silent Hill 2: Special Ed. (2 Disc Cardboard Case) + Manual, Boxed',
               'Silent Hill 2 Directors Cut, + Manual, Boxed',
               'Silent Hill 2: Special Ed. (2 Disc Cardboard Case), No Manual, Boxed',
               'Silent Hill 2 (Standard Blue DVD Case), + Manual, Boxed',
               'Silent Hill 2 Directors Cut, No Manual, Boxed',
               'Silent Hill 2 (Standard Blue DVD Case), No Manual, Boxed',
               'Silent Hill 2: Special Ed. (2 Disc Cardboard Case), Mint',
               'Silent Hill 2 Directors Cut, Mint','Silent Hill 2 (Standard Blue DVD Case), Mint']
        rows=[hit(x,str(n),'Playstation2 Rarities')for n,x in enumerate(names)]
        rows+=[hit('Silent Hill 3, + Manual, Boxed','WRONG','Playstation2 Rarities'),hit('Silent Hill 2','PS5','Playstation5 Software')]
        with patch.object(server,'urlopen',return_value=Response({'results':[{'hits':rows}]})):
            result=server.cex_search('Silent Hill 2 PS2',server.infer_intent('Silent Hill 2 PS2'),grade='Unboxed')
        self.assertEqual({x['productId']for x in result.get('variants',[])},{str(n)for n in range(9)},result)

    def test_accents_match_pokemon_without_weakening_sequel_or_platform_checks(self):
        q='Pokémon Emerald GBA';intent=server.infer_intent(q)
        self.assertIsNotNone(server._cex_candidate_score('Pokemon Emerald, w/ Manual, Boxed','GBA Software',q,intent,{}))
        for title,category in [('Pokemon Ruby, Unboxed','GBA Software'),('Pokemon Emerald 2, Unboxed','GBA Software'),('Pokemon Emerald, Unboxed','Gameboy Color Software')]:
            self.assertIsNone(server._cex_candidate_score(title,category,q,intent,{}))

    def test_alias_and_packaging_rules_never_discard_meaningful_title_words(self):
        intent=server.infer_intent('Krazy Racers GBA')
        for title in ['Konami Krazy Racers 2, Unboxed','Konami Krazy Racers Collection, Boxed','Krazy Racers Ultimate, Mint']:
            self.assertIsNone(server._cex_candidate_score(title,'GBA Software','krazy racers',intent,{}))
        for q,title in [('Super Mario Advance GBA','Super Mario World: Super Mario Advance 2, Unboxed'),('Manual Samuel PS4','Samuel, Boxed')]:
            self.assertIsNone(server._cex_candidate_score(title,'GBA Software' if 'GBA' in q else 'Playstation4 Software',q,server.infer_intent(q),{'confirmedProduct':q.rsplit(' ',1)[0]}))

    def test_game_grades_are_exact_and_do_not_inherit_hardware_defaults(self):
        pairs=[('Game, Unboxed','Unboxed'),('Game, w/o Manual, Boxed','Boxed - without manual'),
               ('Game, w/ Manual, Boxed','Boxed - with manual'),('Game, + Manual, Boxed','Boxed - with manual'),
               ('Game, No Manual, Boxed','Boxed - without manual'),('Game, Mint','Mint')]
        for title,grade in pairs:self.assertEqual(server.cex_game_grade(title),grade)
        self.assertIsNone(server.cex_game_grade('Mint Adventure'))
        self.assertEqual(server.cex_grade_from_title('PS2 Console, Discounted'),'Discounted')

    def test_selected_gba_record_uses_its_own_gbp_prices_and_full_label(self):
        row=hit('Konami Krazy Racers, w/ Manual, Boxed','4988602081558AB')
        with patch.object(server,'cex_detail',return_value=row):
            result=server.cex_search('Krazy Racers GBA',server.infer_intent('Krazy Racers GBA'),grade='Unboxed',selected_product_id=row['boxId'])
        self.assertTrue(result['ok'],result);self.assertEqual(result['product'],row['boxName']);self.assertEqual(result['retail'],40);self.assertEqual(result['cash'],15);self.assertTrue(result['selectedByUser'])

if __name__=='__main__':unittest.main()
