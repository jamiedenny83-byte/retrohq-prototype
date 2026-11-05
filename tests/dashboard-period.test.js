const {test}=require('node:test'),assert=require('node:assert/strict'),O=require('../operations');
test('sale periods have inclusive day boundaries and exclude invalid/future dates',()=>{
 const now='2026-10-30';for(const [period,inside,outside]of [['today','2026-10-30','2026-10-29'],['7','2026-10-24','2026-10-23'],['30','2026-10-01','2026-09-30']]){assert.equal(O.reportPeriod(inside,period,now),true);assert.equal(O.reportPeriod(outside,period,now),false);assert.equal(O.reportPeriod('2026-10-31',period,now),false);for(const invalid of [null,'','bad','2026-02-30'])assert.equal(O.reportPeriod(invalid,period,now),false);}
 assert.equal(O.reportPeriod('2024-01-01','all',now),true);assert.equal(O.reportPeriod('2026-12-28','7','2027-01-03'),true);assert.equal(O.reportPeriod('2024-02-29','7','2024-03-01'),true);
});
test('system tiles use corrected category and current platform, canonicalise aliases and exclude sold/held units',()=>{
 const item={id:1,status:'Listed',category:'Video Game',platform:'gameboy colour',identity:{type:'hardware',platform:'Game Boy Advance'},title:'Corrected game',sale:null},console={...item,id:2,category:'Console',platform:'Game Boy Color'};
 const list=[item,console,{...item,id:3,sale:{price:20}},{...item,id:4,importHold:{reason:'Duplicate'}},{...item,id:5,category:'Toy'}];assert.deepEqual(O.systemStock(list),[{platform:'Game Boy Color',games:1,consoles:1,total:2}]);assert.equal(O.stockSystem(item),'Game Boy Color');assert.equal(O.stockSystem({...item,platform:'SNES'}),'SNES');
 console.category='Video Game';assert.deepEqual(O.systemStock(list),[{platform:'Game Boy Color',games:2,consoles:0,total:2}]);assert.equal(O.stockSystem({title:'Super Nintendo game'}),'SNES');
});
