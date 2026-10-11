'use strict';
// Keep the next positive request when a negative clause has no punctuation.
function positiveText(text){return text.replace(/(?:不要|不想(?:要|喝|吃)?|不喝|不吃|don't want|do not want|avoid).*?(?=[，,。;；!?！？]|(?:但是|但|不过|而是|改成|换成|我想|我要|想吃|想喝)|$)/gi,'');}
function mixedCancellation(text){
 const at=text.search(/不(?:想要|要|买|选|看)了|取消|算了|never mind|cancel|やめます/i);
 return at>=0&&/(?:换成|改成|改为|保留|留下|还要|再加|想吃|想喝|我要|\b(?:instead|keep|switch|add|but)\b)/i.test(text.slice(at));
}
function replacesPurchase(text){return /换成|改成|改为|现在只|不想(?:喝|吃).*?(?:想吃|想喝)|\binstead\b|\bswitch to\b/i.test(text);}
module.exports={positiveText,mixedCancellation,replacesPurchase};
