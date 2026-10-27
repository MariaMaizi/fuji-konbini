(function(){
 'use strict';
 function credit(){
  const brand=document.querySelector('.fuji-name>div');
  if(!brand)return false;
  if(!brand.querySelector('.fuji-author')){const line=document.createElement('p');line.className='fuji-author';line.textContent='by MariaMaizi';brand.append(line);}
  return true;
 }
 if(!credit()){const observer=new MutationObserver(()=>{if(credit())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
})();
