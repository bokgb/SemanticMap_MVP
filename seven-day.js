(function(){
    const SM=window.SemanticMap=window.SemanticMap||{};
    const key='kotoba-hunter-seven-days-v1',local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const today=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const pair=value=>Array.isArray(value)?value[SM.state.currentLang==='zh'?1:0]:value;
    const t=(ja,zh)=>pair([ja,zh]);
    let host,state,debug=false,namespace=key,warning='',feedback='';
    const fresh=()=>({version:1,completed:{},entries:{},active:false,scene:'mailbox',day:2,sideLog:[]});
    const storage=()=>debug?sessionStorage:localStorage;
    function load(){
        try{
            const saved=JSON.parse(storage().getItem(namespace)||'null');
            if(saved?.version!==1||!saved.completed||!saved.entries||Array.isArray(saved.entries)||!Array.isArray(saved.sideLog)||JSON.stringify(saved).length>=100000)return fresh();
            const completed={};for(let n=1;n<=7;n++){const item=saved.completed[n];if(!item||typeof item.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(item.date))break;completed[n]={date:item.date};}
            return {...fresh(),...saved,completed,manualUnlock:Number.isInteger(saved.manualUnlock)&&saved.manualUnlock>=2&&saved.manualUnlock<=7?saved.manualUnlock:null,day:Number.isInteger(saved.day)&&saved.day>=2&&saved.day<=7?saved.day:2,active:saved.active===true,
                scene:['mailbox','letter','task','result','explore','archive','review'].includes(saved.scene)?saved.scene:'mailbox',
                sideLog:saved.sideLog.filter(x=>x&&typeof x.date==='string'&&typeof x.word==='string'&&x.word.length<=40&&[1,2,3].includes(x.quest)).slice(-140)};
        }catch{return fresh();}
    }
    function save(){try{storage().setItem(namespace,JSON.stringify(state));warning='';}catch{warning=t('このブラウザーでは保存できません。画面を閉じると、今日の進み具合が消えることがあります。','此浏览器无法保存，关闭后可能丢失今天的进度。');}}
    const stories=()=>SM.dailyStories(host.words());
    const mainDone=()=>!!(host.progress().mainJourney||host.progress()).done;
    function stampFirst(){if(mainDone()&&!state.completed[1]){state.completed[1]={date:today()};save();}}
    function nextDay(){for(let d=2;d<=7;d++)if(!state.completed[d])return d;return 7;}
    function available(day){return day>=2&&day<=7&&!!state.completed[day-1]&&(today()>state.completed[day-1].date||state.manualUnlock===day);}
    function init(api){
        host=api;debug=local&&['test','preview'].some(k=>new URLSearchParams(location.search).has(k));
        if(debug)namespace=key+':test:'+new URLSearchParams(location.search).get('test');
        state=load();const returning=!!state.completed[1];stampFirst();
        SM.dayTwo?.init({...api,completionActions,complete:()=>{state.completed[2]??={date:today()};state.scene='result';refresh();},revisit:()=>{state.day=2;entry(2).started=true;state.scene='task';state.active=true;refresh();}});
        SM.dayTwo?.setScope(namespace,debug);
        SM.fieldCampaign?.init({...api,completionActions,completeDay:d=>{state.completed[d]??={date:today()};state.scene='result';refresh();},showReview:d=>{state.day=d;state.scene='review';refresh();},showResult:d=>{state.day=d;state.scene='result';refresh();}});
        SM.fieldCampaign?.setScope(namespace,debug);
        SM.freeExplore?.init({...api,nextDayButton,record:c=>{state.sideLog.push({date:today(),quest:{shop:1,park:2,station:3}[c.kind],word:c.word});state.sideLog=state.sideLog.slice(-140);save();}});
        SM.freeExplore?.setScope(namespace,debug);
        if(returning&&mainDone()&&!host.progress().freeRoam)state.active=true;
        document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.active)host.render();});
        // Refresh the mailbox at local midnight without requiring a page reload.
        const midnight=()=>{const date=new Date();date.setHours(24,0,0,100);setTimeout(()=>{if(state.active)host.render();midnight();},Math.min(2147483647,date-Date.now()));};midnight();
    }
    function entry(day){
        const e=state.entries[day];
        if(!e||!Number.isInteger(e.index)||e.index<0||e.index>10||!Array.isArray(e.answers)||!Array.isArray(e.draft))state.entries[day]={index:0,answers:[],draft:[],accepted:false,started:false};
        return state.entries[day];
    }
    const button=(action,label,primary=false,disabled=false)=>`<button type="button" data-week="${action}" class="${primary?'courier-primary':'courier-text'}" ${disabled?'disabled':''}>${primary?host.icon('mail'):''}<span>${escape(label)}</span>${primary?host.icon('arrow'):''}</button>`;
    function shell(body,footer,chapter){
        const root=host.root();root.classList.remove('courier-tutorial','courier-opening','courier-writing','courier-sent','courier-journey','courier-departure','courier-encounter','courier-travel','courier-map-explore','courier-sheet-open');root.classList.add('courier-week');
        root.querySelector('.courier-sheet-header').hidden=true;root.querySelector('.courier-mode-btn').hidden=true;
        root.querySelector('#courier-chapter').innerHTML=`<span class="courier-progress-number">${String(state.day).padStart(2,'0')}</span><span>${escape(chapter)}</span>`;
        root.querySelector('#courier-story-body').innerHTML=`<div class="week-page">${body}${warning?`<p class="week-warning" role="status">${escape(warning)}</p>`:''}</div>`;
        root.querySelector('#courier-actions').innerHTML=footer;
    }
    function mail(story){return `<article class="week-letter"><span class="week-postmark" aria-hidden="true">${host.icon('mail')}<b>DAY ${String(state.day).padStart(2,'0')}</b></span><p class="week-sender">${escape(pair(story.sender))}${t('から','的来信')}</p><h1>${escape(pair(story.title))}</h1>${story.letter.map(line=>`<p>${escape(pair(line))}</p>`).join('')}<small>${escape(pair(story.focus))}</small></article>`;}
    function mailbox(){
        const all=stories(),d=nextDay(),ready=available(d)&&!state.completed[d],count=Object.keys(state.completed).length;
        state.day=d;
        const heading=count===7?t('七つの手紙が、つながった。','七封信，连在了一起。'):ready?t('新しい手紙が届いたよ。','新的来信到了。'):t('つぎの手紙を、待つあいだに。','等待下一封信的时候。');
        const message=count===7?t('これからも、町のことばを集めよう。','以后也继续收集城市里的词语吧。'):ready?pair(all[d].sender)+t('から、きみへ。','写给你的信。'):t('今日の手紙はお届け済み。次のお話にも進めます。','今天的信已送达，也可以继续下一天的故事。');
        const list=all.slice(1).map((s,i)=>{
            const n=i+1,done=!!state.completed[n],open=n===d&&ready;
            return `<li class="${done?'week-delivered':open?'week-new':'week-sealed'}"><button type="button" data-week="${n===1?'first':done?'archive-'+n:open?'read-'+n:'locked'}" ${!done&&!open?'disabled':''}><span class="week-day">${String(n).padStart(2,'0')}</span><span><strong>${escape(pair(s.title))}</strong><small>${escape(done?t('受け取った手紙','已收下的信'):open?t('新しい手紙','新来信'):n===d?t('次の日に届く','次日送达'):t('前の手紙のあとに','上一封完成后'))}</small></span><b aria-hidden="true">${done?'✓':open?'↗':'·'}</b></button></li>`;
        }).join('');
        shell(`<header class="week-mailbox-title"><p>${t('風の郵便局 · 郵便受け','风之邮局 · 邮箱')}</p><h1>${heading}</h1><span class="week-count">${count} / 7 ${t('日','天')}</span></header><div class="week-poco">${host.robot()}<p>${escape(message)}</p></div><ol class="week-mail-list">${list}</ol>`,
            ready?button('read-'+d,t('今日の手紙をひらく','打开今天的信'),true):completionActions(Math.max(1,count)),t('郵便受け','邮箱'));
    }
    function choices(task,e){
        if(task.kind==='pick'){
            const rotate=(state.day+e.index)%task.choices.length;
            return `<div class="week-choices" role="group" aria-label="${escape(pair(task.prompt))}">${task.choices.map((_,n)=>{const i=(n+rotate)%task.choices.length;return `<button type="button" data-week="pick-${i}" aria-pressed="${e.draft[0]===i}" ${e.accepted?'disabled':''}>${escape(task.choices[i])}</button>`;}).join('')}</div>`;
        }
        if(task.kind==='order'){
            const bank=[...task.tokens].reverse();
            return `<div class="week-sentence" aria-label="${t('つくった文','已组成的句子')}">${e.draft.length?e.draft.map((i,n)=>`<button type="button" data-week="remove-${n}" ${e.accepted?'disabled':''}>${escape(bank[i])}<small aria-hidden="true">×</small></button>`).join(''):`<span>${t('下のことばを、順にタップしてね。','依次点击下方词语。')}</span>`}</div><div class="week-word-bank" role="group" aria-label="${t('ことば','词语')}">${bank.map((word,i)=>`<button type="button" data-week="token-${i}" ${e.accepted||e.draft.includes(i)?'disabled':''}>${escape(word)}</button>`).join('')}</div>`;
        }
        return `<div class="week-compose">${task.slots.map((slot,n)=>`<fieldset><legend>${escape(pair(slot.label))}</legend>${slot.choices.map((line,i)=>`<button type="button" data-week="compose-${n}-${i}" aria-pressed="${e.draft[n]===i}" ${e.accepted?'disabled':''}>${escape(line)}</button>`).join('')}</fieldset>`).join('')}</div>`;
    }
    function taskView(){
        const story=stories()[state.day],e=entry(state.day),task=story.tasks[e.index];
        if(!task){state.scene='result';return result();}
        const filled=task.kind==='pick'?e.draft.length>0:task.kind==='order'?e.draft.length===task.tokens.length:task.slots.every((_,n)=>Number.isInteger(e.draft[n]));
        shell(`<header class="week-task-heading"><p>${escape(pair(story.title))}<span>${e.index+1} / ${story.tasks.length}</span></p><h1>${escape(pair(task.prompt))}</h1></header><details class="week-read-again"><summary>${t('手紙をもう一度読む','再读一次信')}</summary>${story.letter.map(line=>`<p>${escape(pair(line))}</p>`).join('')}</details>${task.photo?`<figure class="week-memory-photo"><img src="${escape(task.photo)}" alt="${t('前の旅の写真','之前旅程中的照片')}"><figcaption>${t('きみが届けた一枚','你送来的一张照片')}</figcaption></figure>`:''}${choices(task,e)}<div class="week-feedback ${e.accepted?'week-correct':''}" role="status">${e.accepted?`<strong>${t('届いた！','送到了！')}</strong><p>${escape(pair(task.help))}</p>`:feedback?`<strong>${t('もう一度、考えてみよう。','再想一想。')}</strong><p>${escape(feedback)}</p>`:''}</div>`,
            button(e.accepted?'next':'check',e.accepted?(e.index===story.tasks.length-1?t('今日の手紙を届ける','送出今天的信'):t('つぎへ','下一步')):t('これで届ける','确认送出'),true,!e.accepted&&!filled)+button('mailbox',t('あとで続きをする','稍后继续')),t('今日のお話','今日主线'));
    }
    function result(){
        const story=stories()[state.day],count=Object.keys(state.completed).length,e=entry(state.day);
        const letter=state.day===7?`<article class="week-final-letter"><p>${t('友だちへ','致朋友')}</p>${(e.answers.at(-1)?.text||'').split('\n').map(line=>`<p>${escape(line)}</p>`).join('')}<small>${t('きみより','来自你')}</small></article>`:'';
        shell(`<section class="week-result"><div class="week-complete-stamp">${host.icon('check')}<span>DAY ${state.day}</span></div><p>${count===7?t('七日分の手紙がそろいました','集齐了七天的信'):t('今日のお話、できあがり。','今天的主线，完成了。')}</p><h1>${escape(pair(story.title))}</h1>${letter}<h2>${t('今日のことば','今天的词语')}</h2><dl class="week-new-words">${story.words.map(([word,kana,meaning])=>`<div><dt><ruby>${word}<rt>${kana}</rt></ruby></dt><dd>${SM.state.currentLang==='zh'?meaning:''}</dd></div>`).join('')}</dl><p class="week-return-note">${count===7?t('一週間、ありがとう。','谢谢你一起玩了这一周。'):t('次のお話にも進めます。','也可以继续下一天的故事。')}</p></section>`,completionActions(state.day),t('今日の手紙、完了','今日来信完成'));
    }
    function explore(){
        SM.freeExplore?.setScope(namespace,debug);
        SM.freeExplore?.render(shell,button);
    }
    function render(){
        if(!host||!state)return false;stampFirst();
        if(state.scene==='explore'){
            const latest=Math.max(1,...Object.keys(state.completed).map(Number));
            state.day=Math.max(2,latest);state.scene=latest>1?'result':'mailbox';state.active=latest>1;save();
        }
        SM.dayTwo?.deactivate();
        SM.fieldCampaign?.dispose();
        SM.freeExplore?.dispose();
        host.root().classList.remove('courier-week','courier-free');
        if(!state.active||!mainDone()||host.progress().freeRoam)return false;
        if(state.scene==='letter'||state.scene==='task'){
            if(!available(state.day)&&!state.completed[state.day])state.scene='mailbox';
        }
        if(state.day===2&&['letter','task','result','archive'].includes(state.scene)){
            SM.dayTwo?.setScope(namespace,debug);
            if(SM.dayTwo?.render(state.scene,shell,button))return true;
        }
        if(state.day>=3&&['letter','task','result','archive','review'].includes(state.scene)){
            SM.fieldCampaign?.setScope(namespace,debug);
            if(SM.fieldCampaign?.render(state.day,state.scene,shell,button))return true;
        }
        if(state.scene==='letter')shell(mail(stories()[state.day]),button('start',t('手紙にこたえる','回应来信'),true)+button('mailbox',t('郵便受けに戻る','返回邮箱')),t('今日の手紙','今日来信'));
        else if(state.scene==='task')taskView();
        else if(state.scene==='result')result();
        else if(state.scene==='explore')explore();
        else if(state.scene==='archive'){
            const e=entry(state.day);shell(mail(stories()[state.day])+`<h2 class="week-archive-title">${t('きみが届けたことば','你送出的词语')}</h2><ol class="week-answer-history">${e.answers.map(a=>`<li>${escape(a.text)}</li>`).join('')}</ol>`,button('mailbox',t('郵便受けに戻る','返回邮箱'),true),t('手紙の記録','来信记录'));
        }else mailbox();
        return true;
    }
    function refresh(top=true){save();host.render();if(top)host.root().querySelector('#courier-story-body').scrollTop=0;}
    function open(){host.restoreMain();state.active=true;state.scene='mailbox';feedback='';refresh();}
    function click(event){
        if(SM.freeExplore?.click(event))return true;
        if(SM.fieldCampaign?.click(event))return true;
        if(SM.dayTwo?.click(event))return true;
        const action=event.target.closest('[data-week]')?.dataset.week;if(!action)return false;
        if(action==='completed-next'){
            const from=Number(event.target.closest('[data-week]').dataset.day),day=from+1;
            if(!mainDone()||!state.completed[from]||day<2||day>7)return true;
            state.manualUnlock=day;state.day=day;state.active=true;feedback='';
            state.scene=state.completed[day]?'archive':entry(day).started?'task':'letter';refresh();return true;
        }
        if(action==='ending-day-two'){
            if(!mainDone()||host.progress().freeRoam)return true;
            stampFirst();state.manualUnlock=2;state.day=2;state.active=true;feedback='';
            state.scene=state.completed[2]?'archive':entry(2).started?'task':'letter';refresh();return true;
        }
        if(action==='advance-day'){
            const day=advanceTarget();if(!day||!SM.freeExplore?.isMapView())return true;
            state.manualUnlock=day;state.day=day;state.scene=entry(day).started?'task':'letter';refresh();return true;
        }
        const e=entry(state.day),task=stories()[state.day]?.tasks[e.index];feedback='';
        if(action==='mailbox'){open();return true;}
        if(action==='explore')return true;
        if(action==='first'){state.active=false;refresh();return true;}
        if(action.startsWith('read-')){const d=Number(action.split('-')[1]);if(available(d)&&!state.completed[d]){state.day=d;state.active=true;state.scene=entry(d).started?'task':'letter';refresh();}return true;}
        if(action.startsWith('archive-')){const d=Number(action.split('-')[1]);if(d>=2&&d<=7&&state.completed[d]){state.day=d;state.scene='archive';state.active=true;refresh();}return true;}
        if(action.startsWith('roam-'))return true;
        if(action==='start'){if(available(state.day)&&!state.completed[state.day]){e.started=true;state.scene='task';refresh();}return true;}
        if(state.scene!=='task'||!task||e.accepted&&action!=='next')return true;
        if(action.startsWith('pick-')){const i=Number(action.split('-')[1]);if(task.kind==='pick'&&task.choices[i]!==undefined)e.draft=[i];}
        else if(action.startsWith('token-')){const i=Number(action.split('-')[1]);if(task.kind==='order'&&task.tokens[i]!==undefined&&!e.draft.includes(i))e.draft.push(i);}
        else if(action.startsWith('remove-'))e.draft.splice(Number(action.split('-')[1]),1);
        else if(action.startsWith('compose-')){const [,n,i]=action.split('-').map(Number);if(task.kind==='compose'&&task.slots[n]?.choices[i]!==undefined)e.draft[n]=i;}
        else if(action==='check'){
            const correct=task.kind==='pick'?e.draft[0]===task.answer:task.kind==='order'?e.draft.map(i=>[...task.tokens].reverse()[i]).join('')===task.tokens.join(''):task.slots.every((s,n)=>s.choices[e.draft[n]]!==undefined);
            if(correct){e.accepted=true;const text=task.kind==='pick'?task.choices[e.draft[0]]:task.kind==='order'?task.tokens.join(''):task.slots.map((s,n)=>s.choices[e.draft[n]]).join('\n');e.answers[e.index]={text};SM.audio?.play('complete');SM.audio?.dialogue('week:'+state.day+':'+e.index,'poco-happy',120);}
            else {feedback=pair(task.help);SM.audio?.play('mismatch');}
        }else if(action==='next'&&e.accepted){e.index++;e.draft=[];e.accepted=false;if(e.index===stories()[state.day].tasks.length){state.completed[state.day]={date:today()};state.scene='result';}}
        refresh(action==='next');return true;
    }
    function completionActions(day){
        return host.feedbackLink(true)+(day<7?`<button type="button" class="courier-text courier-restart" data-week="completed-next" data-day="${day}">${t('次の日へ','下一天')}</button>`:'');
    }
    function attachEnding(){
        stampFirst();if(!mainDone()||host.progress().freeRoam)return;
        host.root().querySelector('#courier-actions').insertAdjacentHTML('beforeend',`<button type="button" class="courier-text courier-restart" data-week="ending-day-two">${t('次の日へ','下一天')}</button>`);
    }
    function sideComplete(card,index){state.sideLog.push({date:today(),quest:index,word:String(card.word).slice(0,40)});state.sideLog=state.sideLog.slice(-140);host.restoreMain();state.active=true;state.scene='explore';refresh();SM.audio?.play('stamp');}
    function preview(day,scene='letter',restart=false){
        if(!local)return;debug=true;namespace=key+':test:'+(scene==='explore'?'explore':'day'+day);state=load();
        const revision=scene==='explore'?'free-map-1':day===2?'bridge-1':day>=3?'field-1':'mailbox-1';
        const resetPreview=restart||state.previewDay!==day||state.previewRevision!==revision;
        if(resetPreview){
            state=fresh();state.previewDay=day;state.previewRevision=revision;
            for(let i=1;i<day;i++){const date=new Date();date.setDate(date.getDate()-(day-i));state.completed[i]={date:today(date)};}
        }
        state.day=day;state.active=true;state.scene=scene==='explore'?'explore':scene==='mailbox'?'mailbox':state.completed[day]?'result':entry(day).started?'task':'letter';save();
        SM.dayTwo?.setScope(namespace,debug);
        SM.fieldCampaign?.setScope(namespace,debug);
        SM.freeExplore?.setScope(namespace,debug);
        if(scene==='explore'&&resetPreview)SM.freeExplore?.restartPreview();
        if(day===2&&resetPreview)SM.dayTwo?.restartPreview();
        if(day>=3&&resetPreview)SM.fieldCampaign?.restartPreview(day);
    }
    function reset(){SM.dayTwo?.reset();SM.fieldCampaign?.reset();SM.freeExplore?.reset();state=fresh();feedback='';try{storage().removeItem(namespace);if(debug)localStorage.removeItem(key);}catch{}host.root().classList.remove('courier-week','courier-free');}
    function advanceTarget(){
        if(!state?.active||state.scene!=='explore'||!mainDone()||!state.completed[1])return null;
        const day=nextDay();return !state.completed[day]&&state.completed[day-1]?day:null;
    }
    function nextDayButton(){const day=advanceTarget();return day?button('advance-day',entry(day).started?t('手紙のつづきへ','继续这封信'):t('次の日へ →','前往下一天 →')):'';}
    SM.week={init,render,click,attachEnding,open,preview,reset,sideComplete};
})();
