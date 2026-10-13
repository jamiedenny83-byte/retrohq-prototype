import base64
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
import item_identification as identification
import server

class Reply:
    def __init__(self, data): self.data=data
    def __enter__(self): return self
    def __exit__(self,*_): pass
    def read(self): return json.dumps(self.data).encode()

class IdentificationTests(unittest.TestCase):
    def test_valid_barcodes_keep_leading_zeroes(self):
        self.assertEqual(identification.normalize_barcode('0 12345-678905'),'012345678905')
        self.assertEqual(identification.normalize_barcode('4006381333931'),'4006381333931')
        for value in ['123','4006381333932','400638133393X','https://example.com']:
            with self.assertRaises(ValueError): identification.normalize_barcode(value)

    def test_bad_barcode_never_contacts_catalogue(self):
        with patch.object(server,'pc_detail') as call:
            self.assertEqual(server.pricecharting_lookup('', '123')['mode'],'invalid-barcode')
            call.assert_not_called()

    def test_barcode_resolves_product_query_and_platform(self):
        with patch.object(server,'pc_detail',return_value={'ok':True,'id':'1','product':'Silent Hill 2','console':'PAL Playstation 2'}) as call:
            result=server.pricecharting_lookup('4006381333931','4006381333931')
            self.assertEqual(result['resolvedQuery'],'Silent Hill 2 PAL Playstation 2')
            self.assertEqual(result['intent']['type'],'software')
            call.assert_called_once_with(barcode='4006381333931')

    def test_description_conflict_is_not_silently_accepted(self):
        with patch.object(server,'pc_detail',return_value={'ok':True,'product':'Halo 3','console':'Xbox 360'}):
            self.assertEqual(server.pricecharting_lookup('Silent Hill 2 PS2','4006381333931')['mode'],'invalid-barcode')

    def test_photo_missing_configuration_and_invalid_images_do_not_call_provider(self):
        with patch.dict(os.environ,{},clear=True),patch.object(identification,'urlopen') as call:
            self.assertFalse(identification.identify_photo('anything')['ok']);call.assert_not_called()
        with patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'}),patch.object(identification,'urlopen') as call:
            for image in ['https://example.com/x.jpg','data:image/jpeg;base64,aGVsbG8=',None]:
                self.assertFalse(identification.identify_photo(image)['ok'])
            call.assert_not_called()

    def test_photo_uses_image_schema_and_requires_confirmation_without_prices(self):
        image='data:image/jpeg;base64,'+base64.b64encode(b'\xff\xd8\xfffake-test').decode()
        suggestion={'title':'Silent Hill 2','platform':'PlayStation 2','visible_details':'Readable cover','uncertainty':'Region not visible','confidence':'medium'}
        response={'status':'completed','output':[{'content':[{'type':'output_text','text':json.dumps(suggestion)}]}]}
        with patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'}),patch.object(identification,'urlopen',return_value=Reply(response)) as call:
            result=identification.identify_photo(image)
            self.assertTrue(result['requiresConfirmation']);self.assertEqual(result['suggestion'],suggestion)
            body=json.loads(call.call_args.args[0].data)
            self.assertFalse(body['store']);self.assertEqual(body['input'][0]['content'][1]['image_url'],image)
            self.assertEqual(body['text']['format']['type'],'json_schema')

    def test_photo_refusal_and_http_errors_do_not_leak_provider_body(self):
        image='data:image/jpeg;base64,'+base64.b64encode(b'\xff\xd8\xfffake-test').decode()
        with patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'}),patch.object(identification,'urlopen',return_value=Reply({'status':'completed','output':[{'content':[{'type':'refusal','refusal':'No'}]}]})):
            self.assertFalse(identification.identify_photo(image)['ok'])
        with patch.dict(os.environ,{'OPENAI_API_KEY':'test-only'}),patch.object(identification,'urlopen',side_effect=HTTPError('url',429,'secret upstream body',{},None)):
            result=identification.identify_photo(image);self.assertIn('429',result['status']);self.assertNotIn('secret',result['status'])

    def test_photo_endpoint_protects_provider_and_status_hides_key(self):
        import io
        handler=object.__new__(server.H); handler.path='/api/identify-photo'
        for headers,body,status in [
            ({},b'{}',403),
            ({'X-RetroHQ-Action':'identify-photo','Sec-Fetch-Site':'cross-site'},b'{}',403),
            ({'X-RetroHQ-Action':'identify-photo','Content-Length':'4100001'},b'',400),
            ({'X-RetroHQ-Action':'identify-photo','Content-Length':'15'},b'{"pin":"wrong"}',403),
        ]:
            handler.headers=headers;handler.rfile=io.BytesIO(body)
            with patch.dict(os.environ,{'RETROHQ_ADMIN_PIN':'test-private-pin'}),patch.object(handler,'send_json') as send,patch.object(identification,'identify_photo') as provider:
                handler.do_POST();self.assertEqual(send.call_args.args[1],status);provider.assert_not_called()
        body=json.dumps({'pin':'test-private-pin','image':'test-image'}).encode()
        handler.headers={'X-RetroHQ-Action':'identify-photo','Content-Length':str(len(body))}
        handler.rfile=io.BytesIO(body)
        with patch.dict(os.environ,{'RETROHQ_ADMIN_PIN':'test-private-pin'}),patch.object(handler,'send_json') as send,patch.object(identification,'identify_photo',return_value={'ok':True}) as provider:
            handler.do_POST();self.assertEqual(send.call_args.args[1],200);provider.assert_called_once_with('test-image')
        with patch.dict(os.environ,{'OPENAI_API_KEY':'never-expose-this-key'}):
            self.assertNotIn('never-expose',json.dumps(identification.photo_status()))
