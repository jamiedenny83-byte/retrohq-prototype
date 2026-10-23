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
