(() => {
 const fab=document.querySelector('.sm-bot-fab');if(!fab)return;
 let pending=false;
 const selector='.buy-link,.buy-link-top,.store-link,.details,.card-body h2 a,.partner-category,.admitad-coupon-link,.purchase-links a,.sm-share a,.sm-share button,footer a,.sm-badge,.sm-bot-btn,button,input,select,textarea,summary,iframe,[role="button"],[role="dialog"],.pwa-install,.cookie-banner';
 const check=()=>{pending=false;const f=fab.getBoundingClientRect();const blocked=[...document.querySelectorAll(selector)].some(el=>{if(el===fab||fab.contains(el))return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<f.right+4&&r.right>f.left-4&&r.top<f.bottom+4&&r.bottom>f.top-4});fab.classList.toggle('is-obscured',blocked);fab.tabIndex=blocked?-1:0;fab.setAttribute('aria-hidden',String(blocked));};
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(check)}};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('load',schedule,{once:true});new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
})();