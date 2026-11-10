"""Catalogue selection and scanned identity must reach the correct UK benchmark."""
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import urlopen
from urllib.parse import urlencode
from unittest.mock import patch
import server


class Reply:
    def __init__(self, data): self.data=data
    def __enter__(self): return self
    def __exit__(self,*_): pass
    def read(self): return json.dumps(self.data).encode()


class SearchRepairTests(unittest.TestCase):
    old={'boxName':'Call Of Duty Modern Warfare 3 (18)','boxId':'5030917096846','categoryName':'Xbox 360 Software','sellPrice':3.5}
    new={'boxName':'Call of Duty: Modern Warfare III','boxId':'5030917299780','categoryName':'Xbox Smart Delivery Games','sellPrice':10}

    def pc(self,id):
        return {'ok':True,'id':id,'product':'Call of Duty Modern Warfare 3' if id=='1' else 'Call of Duty Modern Warfare III',
                'console':'PAL Xbox 360' if id=='1' else 'PAL Xbox One','prices':{'cib-price':20},'salesVolume':100}

    def test_chosen_catalogue_supplies_platform_and_full_title_after_mw3_xbox_search(self):
        for id,platform in [('1','Xbox 360'),('2','Xbox One')]:
            pc=self.pc(id);intent=server.confirmed_market_intent('call of duty mw3 xbox',pc,server.infer_intent('call of duty mw3 xbox'))
            self.assertEqual(intent['type'],'software'); self.assertEqual(intent['platform'],platform)
            self.assertEqual(intent['gameTitle'],pc['product'])

    def test_smart_delivery_is_explicit_cross_generation_not_xbox360_or_disc_on_series_s(self):
        for platform,accepted in [('Xbox One',True),('Xbox Series X',True),('Xbox Series S',False),('Xbox 360',False)]:
            score=server._cex_candidate_score(self.new['boxName'],self.new['categoryName'],'modern warfare iii',
                {'type':'software','platform':platform,'gameTitle':self.new['boxName']},{})
            self.assertEqual(score is not None,accepted)

    def test_old_and_new_mw3_do_not_share_prices_or_platform(self):
        for id,wrong in [('1',self.new),('2',self.old)]:
            pc=self.pc(id);intent=server.confirmed_market_intent('mw3 xbox',pc,{})
            identity=server.canonical_identity('mw3 xbox',pc,intent)
            self.assertIsNone(server._cex_candidate_score(wrong['boxName'],wrong['categoryName'],'mw3',intent,identity))

    def test_real_route_returns_each_exact_gbp_value_and_retains_it_on_barcode_grade_refresh(self):
        http=ThreadingHTTPServer(('127.0.0.1',0),server.H);worker=threading.Thread(target=http.serve_forever,daemon=True);worker.start()
        try:
            with patch.object(server,'pc_detail',side_effect=lambda product_id=None,**_:self.pc(product_id or '1')),\
                 patch.object(server,'urlopen',return_value=Reply({'results':[{'hits':[self.old,self.new]}]})),\
                 patch.object(server,'cex_detail',side_effect=lambda id:self.old if id==self.old['boxId'] else self.new),\
                 patch.object(server,'ebay_browse_search',return_value={'ok':False,'status':'Not configured'}),\
                 patch.object(server.time,'sleep'):
                cases=[({'q':'call of duty mw3 xbox','id':'1'},3.5,'Xbox 360'),({'q':'call of duty mw3 xbox','id':'2'},10,'Xbox One'),
                       ({'q':'','barcode':self.old['boxId'],'id':'1','cexGrade':'Unboxed'},3.5,'Xbox 360')]
                for params,value,platform in cases:
                    with urlopen('http://127.0.0.1:'+str(http.server_port)+'/api/market-search?'+urlencode(params)) as r:d=json.load(r)
                    self.assertEqual(d['marketValue'],value,d);self.assertEqual(d['lockedIdentity']['platform'],platform)
                    self.assertEqual(next(e for e in d['evidence'] if e['provider']=='CeX UK')['currency'],'GBP')
                with patch.object(server,'pc_detail',return_value={'ok':False,'status':'UPC not found'}):
                    with urlopen('http://127.0.0.1:'+str(http.server_port)+'/api/market-search?'+urlencode({'barcode':self.old['boxId']})) as r:d=json.load(r)
                    self.assertEqual(d['marketValue'],3.5,d);self.assertEqual(d['lockedIdentity']['source'],'cex-barcode')
        finally:http.shutdown();worker.join();http.server_close()

    def test_uk_ean_uses_exact_cex_record_when_pricecharting_has_no_upc(self):
        with patch.object(server,'pc_detail',return_value={'ok':False}),patch.object(server,'cex_detail',return_value=self.old):
            d=server.pricecharting_lookup('',self.old['boxId'])
            self.assertEqual(d['cexBarcodeId'],self.old['boxId']);self.assertEqual(d['intent']['platform'],'Xbox 360')
        with patch.object(server,'pc_detail',return_value={'ok':False}),patch.object(server,'cex_detail',return_value=self.new):
            self.assertNotIn('cexBarcodeId',server.pricecharting_lookup('',self.old['boxId']))
            d=server.pricecharting_lookup('',self.new['boxId'])
            self.assertEqual(d['cexBarcodeId'],self.new['boxId']);self.assertEqual(d['intent']['platform'],'Xbox One / Series X')

    def test_mw3_shorthand_with_an_explicit_platform_can_find_both_names_but_not_mw2(self):
        intent=server.infer_intent('call of duty mw3 xbox one')
        for title,expected in [('Call of Duty Modern Warfare III',True),('Call of Duty Modern Warfare 3',True),('Call of Duty Modern Warfare 2',False)]:
            self.assertEqual(server.candidate_allowed({'product-name':title,'console-name':'PAL Xbox One'},intent),expected)

    def test_confirmed_platform_coverage_and_game_colours_do_not_become_hardware_attributes(self):
        for console,platform in [('PAL Gamecube','GameCube'),('PAL Nintendo 64','Nintendo 64'),('PAL Playstation','PlayStation 1'),('Nintendo DS','Nintendo DS')]:
            pc={'ok':True,'product':'Game title','console':console}
            self.assertEqual(server.confirmed_market_intent('game',pc,{})['platform'],platform)
        pc={'ok':True,'product':'Pokemon Blue','console':'Game Boy'}
        self.assertEqual(server.canonical_identity('Pokemon Blue',pc,{})['attributes'],{})
