// Browser QA only. This server never calls OpenAI and labels every reply TEST FIXTURE.
const {createServer}=require('./clerk-server.cjs');
const server=createServer({getConfig:()=>({key:'test-placeholder-not-a-real-key',model:'test-fixture'}),fetchImpl:async(url,opts)=>{
 const req=JSON.parse(opts.body),input=JSON.parse(req.input.at(-1).content),text=input.message;
 const swap=/换|different|別の/.test(text);
 const value={message:'[TEST FIXTURE — no API call] '+(/\p{Script=Hiragana}/u.test(text)?'温かい組み合わせをご案内します。':/[\u3400-\u9fff]/u.test(text)?'先吃一点热乎的，再慢慢逛店吧。':'Here is a warm little pairing.'),productIds:input.scene.paused?[]:swap?['sweets:3_01','ice_hd:vanilla']:['pantry:2_07','chilled:1_08'],cardTitle:'A warm little break',context:input.scene.context,size:input.scene.size,dietaryCaution:input.scene.paused};
 if(text==='simulate failure')return {ok:false,status:429};
 return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
}});
server.listen(8012,'127.0.0.1',()=>console.log('TEST FIXTURE only: http://127.0.0.1:8012/?show=clerk&weather=rain'));
