/* ===== src/js/01-app.js ===== */
const app=document.getElementById('app'),modal=document.getElementById('modal');let screen='home',lang='ru',theme='light',navHistory=[],offsets={},filter='all',nearbyMode='list',helperId='v1',articleId='first',mediaIndex=0,awardId='first',scoutBusy=false,scoutTimer=null,chatFollow=true,modalFocus=null,prototypeLoading=null;
const copyRU={},copyEN={};function T(ru,en){copyRU[ru]=ru;copyEN[ru]=en;return lang==='ru'?ru:en}const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const I=n=>`<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" data-icon="${n}" data-icon-source="flaticon">${ICON_PATHS[n]||ICON_PATHS.info}</svg>`;
const button=(label,act,style='')=>`<button class="button ${style}" data-action="${act}">${label}</button>`;const link=(label,id,style='secondary')=>`<button class="button ${style}" data-go="${id}">${label}</button>`;const ib=(name,act,label)=>`<button class="icon-button" data-action="${act}" aria-label="${label}">${I(name)}</button>`;
const initial={version:1,current:'c241',profile:{name:'Алекс',contact:'',petName:'Марта',chip:'',vaccines:'',passport:''},cases:[{id:'c241',number:'0241',group:'domestic',lifecycle:'published',urgency:'ongoing',species:'dog',color:'beige',sex:'unknown',size:'medium',weight:'',breed:'',name:'Рыжий пёс',nameEN:'Sandy dog',features:'Белая грудь',featuresEN:'White chest',publicPlace:'Городской парк',privatePlace:'',foundAt:new Date(Date.now()-95*60000).toISOString(),photo:'assets/dog.png',synthetic:true,step:2,outcome:null,log:[{text:'Случай создан',en:'Case created',at:new Date().toISOString()}],updates:[],consents:{},chats:{},tasks:[],carePassed:false,intakeConfirmed:false,finderPresent:true,lastConfirmed:true},{id:'c242',number:'0242',group:'domestic',lifecycle:'published',urgency:'attention',species:'cat',color:'gray',sex:'unknown',size:'small',weight:'',breed:'',name:'Кошка во дворе',nameEN:'Courtyard cat',features:'Белые лапы',featuresEN:'White paws',publicPlace:'Жилой квартал',privatePlace:'',foundAt:new Date(Date.now()-40*60000).toISOString(),photo:'assets/cat.png',synthetic:true,step:1,outcome:null,log:[{text:'Место требует подтверждения',en:'Location needs confirmation',at:new Date().toISOString()}],updates:[],consents:{},chats:{},tasks:[],carePassed:false,intakeConfirmed:false,finderPresent:false,lastConfirmed:false}],favorites:[],awards:{},scoutMessages:[],prefs:{reduceMotion:false,reduceTransparency:false,increaseContrast:false},triage:{index:0,answers:[],result:null},triageCaseId:null,careAnswers:[],nearbyTasks:[]};
let state;try{state=JSON.parse(localStorage.getItem('podhvat-state-v2'))||structuredClone(initial)}catch{state=structuredClone(initial)}if(!Array.isArray(state.cases)||state.version!==1)state=structuredClone(initial);let storageFailed=false;
function persist(){try{localStorage.setItem('podhvat-state-v2',JSON.stringify(state));return true}catch{storageFailed=true;toast(T('Изменение действует только в этой сессии: сохранение недоступно.','Changes remain in this session: storage is unavailable.'));return false}}
function current(){return state.cases.find(c=>c.id===state.current)||state.cases[0]||initial.cases[0]}function restricted(c=current()){return ['wild','farm'].includes(c.group)}function consent(c=current()){return c.consents[helperId]||{self:false,peer:false}}function contactsAllowed(c=current()){const x=consent(c);return x.self&&x.peer&&c.lifecycle!=='closed'}
function addLog(ru,en,c=current()){c.log.push({text:ru,en,at:new Date().toISOString()});c.lastUpdatedAt=new Date().toISOString();persist()}function award(id){if(!state.awards[id]){state.awards[id]=new Date().toISOString();persist()}}
const helpers=[{id:'v1',name:'Анна',en:'Anna',kind:'person',tag:'Передержка',tagEN:'Foster care',distance:'1,2',type:'foster',groups:['domestic'],rating:'4,9',price:0},{id:'o1',name:'Клиника «Рядом»',en:'Nearby clinic',kind:'organization',tag:'Ветеринарная помощь',tagEN:'Veterinary help',distance:'2,4',type:'clinic',groups:['domestic','unknown'],rating:'4,8',price:null},{id:'o2',name:'Центр помощи животным',en:'Animal support centre',kind:'organization',tag:'Специалист',tagEN:'Specialist',distance:'3,1',type:'specialist',groups:['wild','farm','unknown','domestic'],rating:null,price:null},{id:'v2',name:'Илья · зоотакси',en:'Ilya · pet transport',kind:'person',tag:'Зоотакси',tagEN:'Pet transport',distance:'1,8',type:'transport',groups:['domestic'],rating:'4,9',price:null}];
function helper(){return helpers.find(h=>h.id===helperId)||helpers[0]}const name=c=>lang==='ru'?c.name:c.nameEN||c.name;
function groupName(g){return ({domestic:T('Домашнее','Domestic'),wild:T('Дикое','Wild'),farm:T('Сельскохозяйственное','Farm animal'),unknown:T('Неизвестно','Unknown')})[g]}
function status(c){if(c.lifecycle==='closed')return `<span class="badge closed">${I('check')}${T('Закрыт','Closed')}</span>`;if(c.lifecycle==='draft')return `<span class="badge">${I('edit')}${T('Черновик','Draft')}</span>`;return `<span class="badge ${c.urgency}">${I(c.urgency==='urgent'?'warning':c.urgency==='attention'?'info':'clock')}${({ongoing:T('Идёт','In progress'),attention:T('Нужно внимание','Needs attention'),urgent:T('Срочно','Urgent')})[c.urgency]}</span>`}
const outcomes=()=>({owner:T('Вернулся владельцу','Returned to owner'),foster:T('На временной передержке','In temporary foster care'),organization:T('Приняла организация','Accepted by an organization'),unknown:T('Местонахождение неизвестно','Location unknown')});
function photo(c,large=false){return c.photo?`<button class="photo-button" data-go="media" aria-label="${T('Открыть фото','Open photo')}"><img class="animal-photo ${large?'large':''}" src="${e(c.photo)}" alt="${e(name(c))}"></button>`:`<div class="photo-placeholder">${T('Фото пока нет. Срочная помощь доступна без него.','No photo yet. Urgent help is available without it.')}</div>`}
function caseCard(c,publicView=false){return `<div class="card tight">${publicView?`<img class="animal-photo" src="${e(c.photo||'assets/dog.png')}" alt="${e(name(c))}">`:photo(c)}<div class="case-head"><div><div class="case-name">${e(name(c))}</div><div class="case-location">#${c.number} · ${T('Примерный район','Approximate area')} · ${publicView?T('Рядом с парком','Near the park'):e(c.publicPlace)}</div></div>${status(c)}</div>${publicView?`<p class="caption">${T('Точная точка и контакты скрыты.','Exact location and contacts are hidden.')}</p>`:`<div class="case-next"><div class="split"><span>${T('Следующий шаг','Next step')}</span><span class="caption">${c.step+1} / 5</span></div><h3 class="mt">${nextLabel(c)}</h3><div class="progress">${Array.from({length:5},(_,i)=>`<span class="${i<=c.step?'done':''}"></span>`).join('')}</div>${link(T('Продолжить','Continue'),nextId(c),'dark')}</div>`}</div>`}
function nextId(c=current()){if(c.lifecycle==='closed')return'history-case';if(c.urgency==='urgent')return'emergency';if(c.lifecycle==='draft')return'edit-animal';return ['triage','edit-animal','helpers','tasks','close'][Math.min(c.step,4)]}function nextLabel(c=current()){return c.urgency==='urgent'?T('Связаться со специалистом','Contact a specialist'):[T('Оценить ситуацию','Assess the situation'),T('Зафиксировать приметы','Record identifying features'),T('Найти помощника','Find a helper'),T('Согласовать помощь','Agree on help'),T('Зафиксировать итог','Record the outcome')][Math.min(c.step,4)]}
function row(label,id,iconName='arrow',sub=''){return `<button class="list-row" data-go="${id}">${I(iconName)}<span>${label}${sub?`<small>${sub}</small>`:''}</span><span class="tail">${I('arrow')}</span></button>`}
function hint(text){return `<div class="notice">${text}</div>`}function scope(){return `<div class="phone-scope">${T('Случай','Case')} #${current().number} · ${groupName(current().group)}</div>`}
const V={};
V.home=()=>{const c=current();return `<div class="split"><span class="badge lime">${T('Текущий случай','Current case')}</span><button class="text-button" data-go="cases">${T('Все случаи','All cases')}</button></div><h1>${T('Ваш следующий шаг','Your next step')}</h1><div class="action-row">${link(T('Нашёл животное','Found an animal'),'new-case','')}${button(T('Нужна срочная помощь','Need urgent help'),'urgent','secondary')}</div><div class="spacer"></div>${c.lifecycle==='closed'?`<div class="card"><h3>${T('Случай сохранён в истории','Your case is saved in history')}</h3><p>${outcomes()[c.outcome]}</p>${link(T('Посмотреть историю','View history'),'history')}</div>`:caseCard(c)}<div class="section-title"><h3>${T('Скаут рядом','Scout is here')}</h3></div><div class="scout-card"><div class="scout-top"><span class="scout-mark"><img src="assets/scout.png" alt=""></span><div><h3>${T('Скаут','Scout')}</h3><small>${T('Один шаг за раз','One step at a time')}</small></div></div><p>${T('Я помогу разобраться. Начнём с того, что важно сейчас.','I’ll help you work this out. Let’s start with what matters now.')}</p><div class="mt">${link(T('Спросить Скаута','Ask Scout'),'scout','secondary')}</div></div><div class="stack">${row(T('Диалоги по случаю','Case conversations'),'chats','chat')}${row(T('Помочь кому-то рядом','Help someone nearby'),'nearby','map')}${row(T('Памятки','Guides'),'knowledge','info')}</div>`};
V.welcome=()=>`<span class="badge lime">${T('Подхват','Podhvat')}</span><h1>${T('От находки<br>до понятного итога','From discovery<br>to a clear outcome')}</h1><div class="scout-card"><h3>${T('Сначала — что делать сейчас','First, what to do now')}</h3><p>${T('Затем поможем собрать данные, найти помощников и сохранить историю.','Then we’ll help you record details, find helpers and save the story.')}</p></div>${hint(T('Скаут не ставит диагнозы. В сложной ситуации он ведёт к специалисту.','Scout does not diagnose. In a difficult situation, it directs you to a specialist.'))}${link(T('Продолжить','Continue'),'scenario','')}`;
V.scenario=()=>`<h1>${T('Что привело вас сюда?','What brings you here?')}</h1><div class="stack">${link(T('Я нашёл животное','I found an animal'),'new-case','')}${link(T('Я ищу своего питомца','I’m looking for my pet'),'pet','secondary')}${link(T('Я хочу помочь рядом','I want to help nearby'),'nearby','secondary')}</div><p class="caption mt">${T('Роль можно менять. Аккаунт остаётся один.','You can change your role. There is one account.')}</p>`;
const questions=()=>[[T('Есть непосредственная опасность для людей или животного?','Is there immediate danger to people or the animal?'),T('Не приближайтесь ради ответа.','Do not approach just to answer.')],[T('Видно сильное кровотечение?','Can you see heavy bleeding?'),T('Оценивайте только то, что видно с безопасного расстояния.','Only assess what you can see from a safe distance.')],[T('Дыхание выглядит затруднённым?','Does breathing appear difficult?'),T('Если сомневаетесь, обратитесь к специалисту.','If unsure, contact a specialist.')],[T('Животное не может двигаться самостоятельно?','Is the animal unable to move on its own?'),T('Не проверяйте это прикосновением.','Do not test this by touching it.')],[T('Вы можете оставаться поблизости?','Can you stay nearby?'),T('Не рискуйте собственной безопасностью.','Do not risk your safety.')],[T('Место нахождения подтверждено?','Is the animal’s location confirmed?'),T('Если животное ушло, выберите «нет».','If the animal has moved away, choose “no”.')]];
V.triage=()=>{const q=state.triage,index=q.index;return `${scope()}<div class="split"><span class="badge">${index+1} / 6</span><button class="text-button danger-link" data-action="urgent">${T('Срочно','Urgent')}</button></div><div class="progress">${Array.from({length:6},(_,i)=>`<span class="${i<=index?'done':''}"></span>`).join('')}</div><h1>${questions()[index][0]}</h1><p class="muted">${questions()[index][1]}</p>${restricted()?hint(T('Для диких и сельскохозяйственных животных — только наблюдение издалека и специалист.','For wild and farm animals: distant observation and a specialist.')):''}<div class="stack">${button(T('Да','Yes'),'answer:yes')}${button(T('Нет','No'),'answer:no','secondary')}${button(T('Не знаю','Not sure'),'answer:unknown','secondary')}${index?button(T('Предыдущий вопрос','Previous question'),'triage-back','ghost'):''}</div><p class="caption mt">${T('Ориентир для следующего действия, не медицинское заключение.','A guide to the next action, not a medical assessment.')}</p>`};
V['triage-result']=()=>{const result=state.triage.result||'attention';return `${scope()}<h1>${result==='urgent'?T('Сразу к специалисту','Contact a specialist now'):result==='attention'?T('Нужна дополнительная оценка','Further assessment is needed'):T('Можно наблюдать издалека','You can observe from a distance')}</h1><div class="scout-card"><p>${result==='ongoing'?T('Зафиксируйте находку. Если состояние изменится, обратитесь к специалисту.','Record the finding. If the condition changes, contact a specialist.'):T('Не откладывайте обращение, если заметили опасные признаки или сомневаетесь.','Do not delay contacting a specialist if you notice concerning signs or are unsure.')}</p></div>${hint(T('Результат не подтверждает здоровье животного и не заменяет ветеринарную оценку.','This does not confirm the animal’s health or replace veterinary assessment.'))}${link(T('Следующее действие','Next action'),result==='urgent'||restricted()?'emergency':'edit-animal','')}`};
V.emergency=()=>`${scope()}<span class="badge urgent">${I('warning')}${T('Приоритетная помощь','Priority help')}</span><h1>${restricted()?T('Наблюдайте издалека','Observe from a distance'):T('Сначала — безопасность<br>и специалист','Safety and a specialist<br>come first')}</h1><div class="scout-card"><ol class="instructions"><li>${T('Сохраняйте безопасную дистанцию. Не рискуйте ради фото.','Keep a safe distance. Do not risk your safety for a photo.')}</li><li>${T('Обратитесь к подходящему специалисту и опишите, что видите.','Contact an appropriate specialist and describe what you can see.')}</li><li>${T('Дальнейшие действия согласуйте с ним. Не назначайте лечение самостоятельно.','Agree on further action with them. Do not administer treatment yourself.')}</li></ol></div>${link(T('Найти специалиста','Find a specialist'),'helpers','')}${link(T('Зафиксировать данные позже','Record details later'),'edit-animal','secondary')}<p class="caption mt">${T('Если животное в опасности, обращайтесь в проверенные местные службы.','If the animal is in danger, contact verified local services.')}</p>`;
V['new-case']=()=>`<h1>${T('Новая находка','New finding')}</h1><p class="muted">${T('Начнём с минимальных данных. Остальное можно добавить позже.','Start with a few details. You can add the rest later.')}</p><form id="new-case-form"><label class="field">${T('Группа животного','Animal group')}<select id="new-group">${['domestic','wild','farm','unknown'].map(g=>`<option value="${g}">${groupName(g)}</option>`).join('')}</select></label><label class="field">${T('Вид','Species')}<select id="new-species"><option value="dog">${T('Собака','Dog')}</option><option value="cat">${T('Кошка','Cat')}</option><option value="other">${T('Другой / неизвестно','Other / unknown')}</option></select></label><label class="field">${T('Примерное место','Approximate location')}<input id="new-place" placeholder="${T('Район, парк или ориентир','Area, park or landmark')}" maxlength="100" required><small>${T('Точный адрес не публикуется.','An exact address is not published.')}</small></label><div class="action-row"><button class="button" type="submit">${T('Создать и оценить','Create and assess')}</button>${button(T('Пропустить к срочной помощи','Go straight to urgent help'),'new-urgent','secondary')}</div></form>`;
V.case=()=>{const c=current();return `${scope()}<div class="split"><h1>${T('Ваш случай','Your case')}</h1>${ib('heart','favorite:animal:'+c.id,T('Сохранить животное','Save animal'))}</div>${caseCard(c)}${restricted()?hint(T('Наблюдение издалека. Работу с животным согласует специалист.','Observe from a distance. A specialist directs intervention.')):''}<div class="stack">${row(T('Маршрут помощи','Help journey'),'route','grid')}${row(T('Фото и приметы','Photos and features'),'animal','photo')}${row(T('Возможные совпадения','Possible matches'),'matches','search')}${row(T('Листовка и публикация','Flyer and sharing'),'flyer','download')}${row(T('Задачи и договорённости','Tasks and agreements'),'tasks','check')}${row(T('Обновить место и присутствие','Update location and presence'),'edit-animal','pin')}</div><div class="mt">${link(T('Зафиксировать итог','Record outcome'),'close','secondary')}</div>`};
V.cases=()=>{const list=state.cases.filter(c=>c.lifecycle!=='closed').sort((a,b)=>({urgent:0,attention:1,ongoing:2}[a.urgency])-({urgent:0,attention:1,ongoing:2}[b.urgency]));return `<h1>${T('Активные случаи','Active cases')}</h1><p class="muted">${T('Сначала — срочные. В интерфейсе открыт один текущий случай.','Urgent cases come first. One case is current at a time.')}</p>${list.map(c=>`<button class="card card-link" data-action="switch:${c.id}"><div class="split"><h3>#${c.number} · ${e(name(c))}</h3>${status(c)}</div><p>${e(c.publicPlace)}</p><small class="caption">${c.id===state.current?T('Текущий случай','Current case'):T('Открыть этот случай','Open this case')}</small></button>`).join('')||hint(T('Активных случаев пока нет.','No active cases yet.'))}${link(T('Добавить находку','Add a finding'),'new-case','')}`};
V.route=()=>{const c=current();return `${scope()}<h1>${T('Маршрут помощи','Help journey')}</h1><div class="card">${[[T('Оценить','Assess'),'triage'],[T('Зафиксировать','Record'),'edit-animal'],[T('Найти помощь','Find help'),'helpers'],[T('Согласовать','Agree'),'tasks'],[T('Закрыть','Close'),'close']].map(([n,id],i)=>`<div class="step-row"><span class="step-number ${i===c.step?'current':''}">${i<c.step?I('check'):i+1}</span><div><h3>${n}</h3><small>${i<c.step?T('Данные сохранены','Details saved'):i===c.step?T('Текущий этап','Current step'):T('Впереди','Next')}</small></div><button class="text-button" data-go="${id}">${T('Открыть','Open')}</button></div>`).join('')}</div><h3>${T('Журнал действий','Activity log')}</h3>${timeline(c.log)}`};
function timeline(log){return `<div class="timeline">${log.map(x=>`<div><p>${e(lang==='ru'?x.text:x.en||x.text)}</p><small>${new Date(x.at).toLocaleString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow'})} · MSK</small></div>`).join('')}</div>`}
V.animal=()=>{const c=current();return `${scope()}<h1>${e(name(c))}</h1>${photo(c,true)}<div class="trait-grid mt">${[[T('Группа','Group'),groupName(c.group)],[T('Пол','Sex'),sexLabel(c.sex)],[T('Окрас','Colour'),colorLabel(c.color)],[T('Габариты','Size'),sizeLabel(c.size)],[T('Порода','Breed'),c.breed||T('Неизвестно','Unknown')],[T('Адресник','ID tag'),c.tag||T('Неизвестно','Unknown')]].map(([a,b])=>`<div class="trait"><small>${a}</small>${e(b)}</div>`).join('')}</div><div class="card mt"><h3>${T('Особые приметы','Distinctive features')}</h3><p>${e(lang==='ru'?c.features:c.featuresEN||c.features)||T('Пока не указаны','Not recorded yet')}</p></div>${c.lifecycle==='draft'?button(T('Опубликовать случай','Publish case'),'publish'):link(T('Дополнить описание','Edit description'),'edit-animal','')}${link(T('ID-слепок и сверка','ID record and comparison'),'scanner','secondary')}`};
const sexLabel=x=>({unknown:T('Неизвестно','Unknown'),male:T('Самец','Male'),female:T('Самка','Female')})[x];const sizeLabel=x=>({small:T('Маленькое','Small'),medium:T('Среднее','Medium'),large:T('Крупное','Large'),unknown:T('Неизвестно','Unknown')})[x];const PET_COLORS=[['black','Чёрный','Black','#1E2023'],['white','Белый','White','#F8F8F4'],['gray','Серый','Gray','#9AA3A7'],['brown','Коричневый','Brown','#7B5A45'],['ginger','Рыжий','Ginger','#E08A2E'],['beige','Бежевый','Beige','#E4D3B0'],['tabby','Полосатый','Tabby',''],['spotted','Пятнистый','Spotted',''],['tricolor','Трёхцветный','Tricolour','']];
const colorIds=x=>{const out=[];String(x||'').toLowerCase().split(/[,;/]+|\s+и\s+/).map(v=>v.trim()).filter(Boolean).forEach(v=>{const c=PET_COLORS.find(c=>c[0]===v)||PET_COLORS.find(c=>v.replace(/ё/g,'е').startsWith(c[1].toLowerCase().replace(/ё/g,'е').slice(0,-2))||v===c[2].toLowerCase());if(c&&!out.includes(c[0]))out.push(c[0])});return out};
const colorLabel=x=>{const ids=colorIds(x);if(ids.length)return ids.map(id=>{const c=PET_COLORS.find(c=>c[0]===id);return T(c[1],c[2])}).join(', ');return ({unknown:T('Неизвестно','Unknown')})[x]||x||T('Неизвестно','Unknown')};
const colorSwatch=(id,cls='sw')=>{const c=PET_COLORS.find(c=>c[0]===id);return c?`<i class="${cls}" data-p="${c[3]?'':id}" style="--c:${c[3]||'transparent'}" aria-hidden="true"></i>`:''};
const colourField=c=>{const on=colorIds(c.color);return `<div class="field colour-field" role="group" aria-labelledby="colour-lbl"><span id="colour-lbl" class="colour-lbl">${T('Окрас','Colour')}</span><div class="colour-tags">${PET_COLORS.map(([id,ru,en])=>`<button type="button" class="ctag" data-colour="${id}" aria-pressed="${on.includes(id)}">${colorSwatch(id)}<span>${T(ru,en)}</span></button>`).join('')}</div><small>${T('Можно выбрать несколько. По окрасу животных можно фильтровать.','You can pick several. Animals can be filtered by colour.')}</small><input id="animal-color" type="hidden" value="${e(on.join(','))}"></div>`};
function selectField(label,id,options,value){return `<label class="field">${label}<select id="${id}">${options.map(([v,n])=>`<option value="${v}" ${v===value?'selected':''}>${n}</option>`).join('')}</select></label>`}
V['edit-animal']=()=>{const c=current();if(c.lifecycle==='closed')return hint(T('Карточка закрыта. Дополнения доступны через обновления истории.','This case is closed. Add information through history updates.'))+link(T('Обновить историю','Add history update'),'update','');return `${scope()}<h1>${T('Приметы и место','Features and location')}</h1><form id="animal-form"><label class="field">${T('Название карточки','Card title')}<input id="animal-name" value="${e(name(c))}" maxlength="60" required></label>${selectField(T('Пол','Sex'),'animal-sex',['unknown','male','female'].map(x=>[x,sexLabel(x)]),c.sex)}${selectField(T('Габариты','Size'),'animal-size',['unknown','small','medium','large'].map(x=>[x,sizeLabel(x)]),c.size)}${colourField(c)}<label class="field">${T('Порода, если известна','Breed, if known')}<input id="animal-breed" value="${e(c.breed)}" maxlength="80"></label><label class="field">${T('Вес, кг / неизвестно','Weight, kg / unknown')}<input id="animal-weight" inputmode="decimal" value="${e(c.weight)}" placeholder="—"></label><label class="field">${T('Особые приметы','Distinctive features')}<textarea id="animal-features" maxlength="500">${e(c.features)}</textarea></label><label class="field">${T('Адресник / надпись','ID tag / inscription')}<input id="animal-tag" value="${e(c.tag||'')}" maxlength="100"><small>${T('Контакт на адреснике не попадёт в публичную листовку.','A contact on the tag will not appear in the public flyer.')}</small></label><label class="field">${T('Публичный район','Public area')}<input id="animal-place" value="${e(c.publicPlace)}" required maxlength="100"></label><label class="field">${T('Точная точка — приватно','Exact location — private')}<input id="animal-private" value="${e(c.privatePlace)}" maxlength="160"></label><label class="field">${T('Добавить фото','Add photo')}<input type="file" id="animal-photo" accept="image/*"><small>${T('До 5 МБ.','Up to 5 MB.')}</small></label><label class="check"><input id="animal-present" type="checkbox" ${c.finderPresent?'checked':''}>${T('Я могу оставаться рядом','I can stay nearby')}</label><label class="check"><input id="animal-confirmed" type="checkbox" ${c.lastConfirmed?'checked':''}>${T('Место сейчас подтверждено','The location is confirmed now')}</label><p class="error" id="animal-error" role="alert"></p><button class="button" type="submit">${T('Сохранить данные','Save details')}</button></form>${c.lifecycle==='draft'?button(T('Опубликовать случай','Publish case'),'publish','secondary'):''}`};
function helperCard(h){return `<div class="card"><div class="partner-name"><span class="partner-symbol">${I(h.kind==='organization'?'office':'user')}</span><div><h3>${lang==='ru'?h.name:h.en}</h3><small class="caption">${h.distance} ${T('км','km')}${h.rating?' · ★ '+h.rating:''}</small></div></div><div class="tag-row"><span class="badge lime">${lang==='ru'?h.tag:h.tagEN}</span><span class="badge">${h.price===0?T('Бесплатно','Free'):T('Уточнить условия','Ask about terms')}</span></div><p class="caption">${T('Готовность помочь ещё не подтверждена.','Availability has not been confirmed.')}</p><button class="button secondary" data-action="helper:${h.id}">${T('Подробнее','Details')}</button></div>`}
V.helpers=()=>{const c=current(),list=helpers.filter(h=>restricted()?h.type==='specialist':c.urgency==='urgent'?['clinic','specialist'].includes(h.type):true);return `${scope()}<h1>${restricted()?T('Подходящий специалист','Appropriate specialist'):T('Помощники рядом','Helpers nearby')}</h1>${hint(T('Карточка на карте не означает свободное место или согласие принять.','A map listing does not mean capacity or intake consent.'))}<div class="tab-filter">${[['all',T('Все','All')],['person',T('Люди','People')],['organization',T('Организации','Organizations')]].map(([v,n])=>`<button data-action="helper-filter:${v}" class="${filter===v?'active':''}">${n}</button>`).join('')}</div>${list.filter(h=>filter==='all'||h.kind===filter).map(helperCard).join('')||hint(T('В этой категории нет подходящих помощников.','No suitable helpers in this category.'))}`};
V.helper=()=>{const h=helper(),c=current();return `${scope()}<h1>${lang==='ru'?h.name:h.en}</h1><div class="card"><div class="partner-name"><span class="partner-symbol">${I(h.kind==='organization'?'office':'user')}</span><span class="badge lime">${lang==='ru'?h.tag:h.tagEN}</span></div><p>${h.distance} ${T('км · вымышленная карточка','km · fictional listing')}</p><p>${T('Принимаемые группы:','Supported groups:')} ${h.groups.map(groupName).join(', ')}</p><p>${T('Стоимость:','Price:')} ${h.price===0?T('бесплатно','free'):T('уточняется отдельно','confirmed separately')}</p><p>${T('Ответ:','Response:')} ${c.tasks.some(x=>x.helperId===h.id&&x.status!=='offered')?T('Подтверждение получено','Confirmation received'):T('ожидаем подтверждения','awaiting confirmation')}</p></div>${restricted()&&h.type!=='specialist'?hint(T('Этот тип помощи недоступен для данной группы животных.','This assistance type is not available for this animal group.')):button(T('Отправить запрос','Send request'),'request-helper')}${button(T('В избранное','Save to favorites'),'favorite:'+h.kind+':'+h.id,'secondary')}${link(T('Диалог по случаю','Case conversation'),'chat','secondary')}${h.kind==='organization'?hint(T('Согласие на приём и согласие на контакты подтверждаются отдельно.','Intake consent and contact consent are confirmed separately.')):''}`};
V.matches=()=>{const c=current();return `${scope()}<h1>${T('Возможные совпадения','Possible matches')}</h1>${hint(T('Сходство примет — повод проверить. Это не доказательство владельца.','Similar features are a lead to check, not proof of ownership.'))}${restricted()?hint(T('Для этой группы нет примерных объявлений о пропаже.','No sample lost-pet listings for this group.')):`<div class="card">${photo(c)}<h3 class="mt">${T('Похожее объявление','Similar listing')}</h3><p>${T('Совпадают вид и окрас. Пол неизвестен; габариты требуют проверки.','Species and colour match. Sex is unknown; size needs verification.')}</p><div class="mt">${link(T('Сравнить признаки','Compare features'),'match','')}</div></div>`}${link(T('Посмотреть ID-слепок','View ID record'),'scanner','secondary')}`};
V.match=()=>`${scope()}<h1>${T('Проверим признаки','Compare features')}</h1><div class="trait-grid">${[[T('Вид','Species'),T('Совпадает','Matches')],[T('Окрас','Colour'),T('Похож','Similar')],[T('Пол','Sex'),T('Неизвестно','Unknown')],[T('Габариты','Size'),T('Нужна проверка','Needs verification')],[T('Адресник','Tag'),T('Нет данных','No data')],[T('ID-слепок','ID record'),T('Не подтверждён','Unverified')]].map(([a,b])=>`<div class="trait"><small>${a}</small>${b}</div>`).join('')}</div><div class="scout-card mt"><p>${T('Сравните дополнительные приметы и документы. Контакты открываются только по взаимному согласию.','Compare additional features and documents. Contacts require mutual consent.')}</p></div>${button(T('Начать диалог с заявителем','Start a conversation with claimant'),'match-chat')}`;
V.flyer=()=>{const c=current();return `${scope()}<h1>${T('Листовка без лишних данных','A flyer with private details protected')}</h1><div class="preview-flyer">${c.photo?`<img class="animal-photo" src="${e(c.photo)}" alt="${e(name(c))}">`:''}<h2>${T('Найдено животное','Animal found')}</h2><p>${e(name(c))} · #${c.number}</p><p>${T('Примерный район:','Approximate area:')} ${e(c.publicPlace)}</p><p class="caption mt">${T('QR появится после выдачи защищённой ссылки сервером.','QR is generated after a secure link is issued by the server.')}</p></div><div class="public-hidden">${I('shield')}${T('Телефон, чип и точный адрес исключены.','Phone, chip and exact address are excluded.')}</div>${button(T('Скачать SVG-листовку','Download SVG flyer'),'download-flyer')}${link(T('Выбрать каналы','Choose channels'),'channels','secondary')}`};
V.channels=()=>`<h1>${T('Где поделиться листовкой','Where to share your flyer')}</h1><p class="muted">${T('Выберите, где поделиться листовкой.','Choose where to share the flyer.')}</p><div class="card">${['Telegram','ВК / VK','Max','WhatsApp'].map(n=>`<label class="check"><input type="checkbox" name="channel" value="${n}">${n}</label>`).join('')}</div>${button(T('Подготовить текст публикации','Prepare sharing text'),'prepare-share')}<div id="share-preview" class="notice hidden mt"></div>${link(T('Вернуться к листовке','Back to flyer'),'flyer','secondary')}`;
V.care=()=>restricted()?hint(T('Передержка для этой группы не предлагается. Нужен специалист.','Foster care is not offered for this group. Contact a specialist.'))+link(T('Найти специалиста','Find a specialist'),'helpers',''):`${scope()}<h1>${T('План заботы на передержке','Foster care planning')}</h1><p class="muted">${T('Проверим условия. Это не заключение о здоровье животного.','Check the conditions. This is not an assessment of the animal’s health.')}</p><form id="care-form"><div class="card">${[T('Есть безопасное отдельное место','A safe separate space is available'),T('Уход согласован с ветеринаром при необходимости','Veterinary care has been agreed where needed'),T('Срок и ответственный согласованы','Duration and responsible person are agreed')].map((n,i)=>`<label class="check"><input type="checkbox" name="care" value="${i}">${n}</label>`).join('')}</div><button class="button" type="submit">${T('Проверить план','Review plan')}</button></form>`;
V['care-result']=()=>`<h1>${current().carePassed?T('План согласован','Plan agreed'):T('Условия нужно уточнить','Conditions need clarification')}</h1><div class="scout-card"><p>${current().carePassed?T('Укажите ответственного и срок. При изменении состояния обратитесь к ветеринару.','Record the responsible person and duration. If the condition changes, contact a veterinarian.'):T('Не принимайте обязательства без безопасных условий. Найдём помощника.','Do not commit without safe conditions. Let’s find a helper.')}</p></div>${hint(T('Проверка списка не подтверждает пригодность помещения или медицинскую безопасность.','A checklist does not certify the space or medical safety.'))}${link(T('Перейти к помощникам','Find helpers'),'helpers','')}${link(T('Зафиксировать итог','Record outcome'),'close','secondary')}`;
const nearbyCase={...initial.cases[1],id:'nearby1',number:'0318',urgency:'attention'};
V.nearby=()=>`<h1>${T('Помощь рядом','Help nearby')}</h1><div class="tab-filter">${[['list',T('Лента','Feed')],['map',T('Карта','Map')]].map(([v,n])=>`<button data-action="nearby-mode:${v}" class="${nearbyMode===v?'active':''}">${n}</button>`).join('')}</div>${nearbyMode==='map'?`<div class="map-surface"><div class="map-label">${T('Схема района · точные точки скрыты','Area diagram · exact locations hidden')}</div></div>`:''}<button class="card card-link" data-go="nearby-case"><img class="animal-photo" src="assets/cat.png" alt="${T('Фото кошки','Cat photo')}"><div class="case-head"><h3>${T('Нужна помощь с поиском','Search assistance needed')}</h3>${status(nearbyCase)}</div><p>${T('Около парка · 800 м','Near the park · 800 m')}</p></button>${hint(T('Открытая лента не показывает точный адрес, телефон или чип.','The public feed does not show exact addresses, phone numbers or chips.'))}`;
V['nearby-case']=()=>`<h1>#0318 · ${T('Кошка во дворе','Courtyard cat')}</h1>${caseCard(nearbyCase,true)}${link(T('Предложить помощь','Offer help'),'offer','')}${button(T('Сохранить животное','Save animal'),'favorite:animal:nearby1','secondary')}`;
V.offer=()=>`<h1>${T('Чем вы можете помочь?','How can you help?')}</h1><form id="offer-form">${selectField(T('Задача','Task'),'offer-type',restricted(nearbyCase)?[['observe',T('Наблюдение издалека','Distant observation')]]:[['search',T('Поиск','Search')],['observe',T('Наблюдение','Observation')],['transport',T('Зоотакси','Pet transport')],['foster',T('Передержка','Foster care')]],'search')}<label class="field">${T('Когда доступны','When you are available')}<input id="offer-time" placeholder="${T('Сегодня после 18:00','Today after 18:00')}" maxlength="100" required></label><button class="button" type="submit">${T('Предложить задачу','Offer a task')}</button></form>${hint(T('Предложение ещё не означает назначение. Нужен ответ второй стороны.','An offer is not an assignment. The other party must respond.'))}`;
V.tasks=()=>{const c=current();return `${scope()}<h1>${T('Задачи по случаю','Case tasks')}</h1>${c.tasks.map(x=>`<div class="card"><h3>${e(lang==='ru'?x.title:x.titleEN)}</h3><p>${({offered:T('Предложена · ждём ответа','Offered · awaiting response'),assigned:T('Назначена','Assigned'),completed:T('Выполнена','Completed')})[x.status]}</p><p class="caption">${T('Срок:','Due:')} ${e(x.deadline||T('Уточнить в диалоге','Agree in chat'))}</p>${c.lifecycle==='closed'?hint(T('Случай закрыт, задача только для чтения.','Case closed, task is read-only.')):x.status==='offered'?button(T('Имитировать принятие помощником','Simulate helper acceptance'),'accept-task:'+x.id,'secondary'):x.status==='assigned'?button(T('Отметить выполнение','Mark complete'),'complete-task:'+x.id):''}</div>`).join('')||hint(T('Пока нет согласованных задач. Выберите помощника.','No agreed tasks yet. Choose a helper.'))}${state.nearbyTasks.length?`<div class="card"><h3>${T('Мои предложения рядом','My nearby offers')}</h3><p>${state.nearbyTasks.length} · ${T('предложено · случай #0318','offered · case #0318')}</p></div>`:''}${link(T('Найти помощь','Find help'),'helpers','secondary')}${c.tasks.some(x=>x.status==='completed')?link(T('Зафиксировать итог','Record outcome'),'close',''):''}`};
V.chats=()=>{const c=current();return `${scope()}<h1>${T('Связь по случаю','Case conversations')}</h1>${Object.keys(c.chats).map(id=>{const h=helpers.find(x=>x.id===id);return `<button class="list-row" data-action="open-chat:${id}">${I('chat')}<span>${h?(lang==='ru'?h.name:h.en):T('Заявитель','Claimant')}<small>${c.lifecycle==='closed'?T('Архив · только чтение','Archive · read-only'):T('Активный диалог','Active conversation')}</small></span></button>`}).join('')||hint(T('Диалог появится после запроса помощнику или заявителю.','A conversation appears after contacting a helper or claimant.'))}<div class="stack mt">${link(T('Помощники и организации','Helpers and organizations'),'helpers','')}${link(T('Задачи','Tasks'),'tasks','secondary')}${link(T('Архив случаев','Case archive'),'history','secondary')}</div>`};
function messages(){const c=current();return c.chats[helperId]||[]}
function bubbles(items){return items.map(m=>`<div class="bubble ${m.role==='self'?'me':m.role==='system'?'system':''}">${e(lang==='ru'?m.text:m.en||m.text)}${m.at?`<small>${new Date(m.at).toLocaleTimeString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'})}</small>`:''}</div>`).join('')}
V.chat=()=>{const c=current();return `${scope()}<div class="split"><span class="badge">${helperId==='claimant'?T('Заявитель','Claimant'):lang==='ru'?helper().name:helper().en}</span>${c.lifecycle==='closed'?status(c):ib('shield','go-consent',T('Согласие на контакты','Contact consent'))}</div>${c.lifecycle==='closed'?hint(T('Архив: сообщения недоступны для редактирования и отправки.','Archive: messages cannot be edited or sent.')):hint(T('Телефон и точное место скрыты до взаимного согласия.','Phone and exact location stay private until mutual consent.'))}<div id="chat-messages" class="chat-list">${bubbles(messages())||hint(T('Начните с короткого сообщения.','Start with a short message.'))}</div>`};
V.consent=()=>{const c=current(),x=consent(c);return `${scope()}<h1>${T('Контакты по согласию','Contacts by consent')}</h1><div class="card"><div class="split"><span>${T('Ваше согласие','Your consent')}</span><span class="badge ${x.self?'lime':''}">${x.self?T('Дано','Granted'):T('Не дано','Not granted')}</span></div><div class="split mt"><span>${T('Согласие собеседника','Other party’s consent')}</span><span class="badge ${x.peer?'lime':''}">${x.peer?T('Дано локально','Granted locally'):T('Ожидаем','Waiting')}</span></div></div>${hint(T('Согласие относится только к этому случаю и этому собеседнику. Его можно отозвать.','Consent applies only to this case and this peer. You can revoke it.'))}${c.lifecycle==='closed'?hint(T('Для закрытого случая новые звонки недоступны.','New calls are unavailable for a closed case.')):`<div class="stack">${button(x.self?T('Отозвать своё согласие','Revoke my consent'):T('Разрешить контакты для этого диалога','Allow contacts for this conversation'),'consent-self',x.self?'secondary':'')}${button(T('Согласие собеседника','Other party’s consent'),'consent-peer','secondary')}</div>`}${contactsAllowed(c)?`<div class="card mt"><h3>${T('Контакты доступны локально','Contacts available locally')}</h3><p>${T('Телефон: примерный контакт без номера','Phone: sample contact without a real number')}</p><p>${T('Точная точка:','Exact location:')} ${e(c.privatePlace)||T('не указана','not provided')}</p><div class="action-row mt">${link(T('Звонок','Call'),'call','')}${link(T('Видео','Video'),'video','secondary')}</div></div>`:''}`};
V.call=()=>contactsAllowed()?`<h1>${T('Звонок','Call')}</h1><div class="scout-card"><h3>${T('Соединение не выполняется','No connection is made')}</h3><p>${T('Взаимное согласие проверено. Реальный звонок требует сервиса связи.','Mutual consent has been checked. A real call needs a communications service.')}</p></div>${button(T('Завершить звонок','End local call'),'end-call')}`:hint(T('Сначала нужно согласие обеих сторон.','Both parties must consent first.'))+link(T('Проверить согласие','Check consent'),'consent','');
V.video=()=>contactsAllowed()?`<h1>${T('Видеосвязь','Video call')}</h1><div class="photo-placeholder">${I('user')} ${T('Камера не включена','Camera is off')}</div><p class="muted mt">${T('Доступ к камере не запрашивается. В native нужен отдельный запрос разрешения после действия пользователя.','Camera access is not requested. Native requires permission after a user action.')}</p>${button(T('Завершить просмотр','End preview'),'end-call')}`:V.call();
V.close=()=>{const c=current();if(c.lifecycle==='closed')return hint(T('Этот случай уже закрыт.','This case is already closed.'))+link(T('Открыть историю','Open history'),'history-case','');return `${scope()}<h1>${T('Что произошло дальше?','What happened next?')}</h1><form id="close-form">${Object.entries(outcomes()).map(([id,n])=>`<label class="outcome-option"><input type="radio" name="outcome" value="${id}" required>${n}</label>`).join('')}<label class="check"><input id="close-confirmed" type="checkbox" required>${T('Я подтверждаю выбранный итог','I confirm the selected outcome')}</label><p class="error" id="close-error" role="alert"></p><button class="button" type="submit">${T('Подтвердить закрытие','Confirm closure')}</button></form>${hint(T('Чаты уйдут в архив. Позже можно добавить отдельное обновление истории.','Chats will be archived. You can add a separate history update later.'))}${link(T('Проверить план передержки','Review foster plan'),'care','secondary')}`};
V.history=()=>`<h1>${T('История случаев','Case history')}</h1>${state.cases.filter(c=>c.lifecycle==='closed').map(c=>`<button class="card card-link" data-action="history:${c.id}"><div class="split"><h3>#${c.number} · ${e(name(c))}</h3>${status(c)}</div><p>${outcomes()[c.outcome]}</p><small class="caption">${T('Последнее обновление:','Last updated:')} ${new Date(c.lastUpdatedAt||c.closedAt).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow'})}${c.updates.some(x=>x.isNew)?' · '+T('Новое','New'):''}</small></button>`).join('')||hint(T('Здесь появятся закрытые случаи.','Closed cases will appear here.'))}${link(T('Активные случаи','Active cases'),'cases','secondary')}`;
V['history-case']=()=>{const c=current();return `${scope()}<h1>${e(name(c))}</h1>${status(c)}<div class="card mt"><h3>${T('Итог','Outcome')}</h3><p>${outcomes()[c.outcome]||T('Ещё не закрыт','Not closed yet')}</p></div>${timeline(c.log)}<h3>${T('Обновления участников','Participant updates')}</h3>${c.updates.map(x=>`<div class="card mt"><p>${e(x.text)}</p><small class="caption">${new Date(x.at).toLocaleString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow'})}</small></div>`).join('')||hint(T('Обновлений пока нет.','No updates yet.'))}<div class="stack mt">${link(T('Добавить обновление','Add update'),'update','')}${link(T('Архив диалогов','Conversation archive'),'chats','secondary')}</div>`};
V.update=()=>`<h1>${T('Новости после закрытия','News after closure')}</h1>${hint(T('Обновление добавляется отдельно. Закрытый чат остаётся только для чтения.','Updates are separate records. Closed chats remain read-only.'))}<form id="update-form"><label class="field">${T('Что изменилось?','What changed?')}<textarea id="history-update" maxlength="1000" required></textarea></label><button class="button" type="submit">${T('Сохранить обновление','Save update')}</button></form>`;
V.scout=()=>`${scope()}<div class="scout-top"><span class="scout-mark"><img src="assets/scout.png" alt=""></span><div><h1>${T('Скаут','Scout')}</h1><small class="caption">${T('Ваш помощник по текущему случаю','Your current-case assistant')}</small></div></div><div class="notice">${T('Ответы Скаута. Скаут не ставит диагнозы и не назначает лечение.','Scout responses. Scout does not diagnose or prescribe treatment.')}</div><div class="action-row">${link(T('Первичная оценка','Initial assessment'),'triage','secondary')}${link(T('Памятки','Guides'),'knowledge','secondary')}</div><div id="scout-messages" class="chat-list mt">${bubbles(state.scoutMessages.filter(m=>m.caseId===state.current))||`<div class="bubble">${T('Расскажите, что видите. Я предложу одно следующее действие.','Tell me what you can see. I’ll suggest one next action.')}</div>`}${scoutBusy?`<div class="bubble" role="status"><span class="spinner" aria-hidden="true"></span> ${T('Готовлю ответ…','Preparing a response…')}</div>`:''}</div>`;
const articles=()=>[{id:'first',name:T('Что делать первым','What to do first'),body:T('Сохраняйте безопасную дистанцию. Опишите видимые признаки. При опасных признаках или сомнениях свяжитесь со специалистом.','Keep a safe distance. Describe visible signs. If signs are concerning or you are unsure, contact a specialist.')},{id:'injured',name:T('Раненое животное','Injured animal'),body:T('Первая помощь не заменяет ветеринарную. Обратитесь к ветеринару и согласуйте дальнейшие действия.','First aid does not replace veterinary care. Contact a veterinarian and agree on further action.')},{id:'wild',name:T('Дикое и сельскохозяйственное','Wild and farm animals'),body:T('Наблюдайте издалека. Не предлагайте самостоятельный выезд и захват. Дальнейшие действия согласует специалист.','Observe from a distance. Do not arrange independent capture. A specialist directs further action.')},{id:'owner',name:T('Проверка владельца','Verify ownership'),body:T('Сравните фотографии и особые приметы, запросите подтверждающие сведения. Совпадение объявления не доказывает владение.','Compare photos and distinctive features, and ask for supporting information. A matching listing does not prove ownership.')},{id:'care',name:T('Вода, кормление и уход','Water, feeding and care'),body:T('Условия ухода зависят от животного и его состояния. Не назначайте лекарства. При сомнениях спросите ветеринара.','Care depends on the animal and its condition. Do not prescribe medication. If unsure, ask a veterinarian.')},{id:'bite',name:T('Укус и агрессивное поведение','Bite and aggressive behavior'),body:T('Не приближайтесь и не провоцируйте животное. При травме человеку нужна медицинская помощь. Действия с животным согласуйте со специалистом.','Do not approach or provoke the animal. A person who is injured needs medical help. Agree animal-related actions with a specialist.')},{id:'winter',name:T('Зима и животное на дороге','Winter and an animal on the road'),body:T('Не выходите на дорогу ради помощи. Сначала обеспечьте собственную безопасность и свяжитесь с подходящими службами.','Do not step into traffic to help. Protect your safety first and contact the appropriate services.')},{id:'capture',name:T('Кошка или собака: контакт','Cat or dog: approaching'),body:T('Не пытайтесь поймать незнакомое животное без оценки рисков. Попросите специалиста подсказать безопасное действие.','Do not try to catch an unfamiliar animal without assessing risks. Ask a specialist for safe guidance.')},{id:'longterm',name:T('Подкармливание и стерилизация','Feeding and sterilization'),body:T('Долгосрочный план ухода и стерилизации согласуется с ветеринаром и ответственными участниками.','Agree long-term care and sterilization plans with a veterinarian and responsible participants.')}];
V.knowledge=()=>`<h1>${T('Памятки Скаута','Scout guides')}</h1><p class="muted">${T('Короткий ориентир и следующее действие. Детальные инструкции требуют проверки специалистом.','A brief guide and next action. Detailed instructions require expert review.')}</p><div class="stack">${articles().map(a=>`<button class="list-row" data-action="article:${a.id}">${I('info')}${a.name}</button>`).join('')}</div>`;
V.article=()=>{const a=articles().find(a=>a.id===articleId)||articles()[0];return `<h1>${a.name}</h1><div class="scout-card"><p>${a.body}</p></div>${link(T('Найти специалиста','Find a specialist'),'helpers','')}${link(T('Спросить Скаута','Ask Scout'),'scout','secondary')}<p class="caption mt">${T('Редакционный базовый текст. Для выпуска необходима локальная экспертная проверка.','Basic editorial content. Local expert review is required before release.')}</p>`};
V.profile=()=>`<div class="avatar" style="width:76px;height:76px;font-size:26px">${e(state.profile.name.slice(0,2).toUpperCase())}</div><h1>${e(state.profile.name)}</h1><p class="muted">${T('Пользователь · локальный профиль','User · local profile')}</p><div class="stats"><div><strong>${state.cases.filter(c=>c.lifecycle==='closed').length}</strong><span class="caption">${T('Случаев в истории','Cases in history')}</span></div><div><strong>${Object.keys(state.awards).length}</strong><span class="caption">${T('Наград','Awards')}</span></div></div><div class="stack mt">${row(T('Мой питомец','My pet'),'pet','heart')}${row(T('История случаев','Case history'),'history','clock')}${row(T('Награды и уровень','Awards and level'),'awards','check')}${row(T('Избранное','Saved items'),'favorites','heart')}${row(T('Диалоги','Conversations'),'chats','chat')}${row(T('Редактировать профиль','Edit profile'),'edit-profile','edit')}${row(T('Настройки и приватность','Settings and privacy'),'settings','shield')}</div>`;
V['edit-profile']=()=>`<h1>${T('Ваш профиль','Your profile')}</h1><form id="profile-form"><label class="field">${T('Имя','Name')}<input id="profile-name" value="${e(state.profile.name)}" required maxlength="60"></label><label class="field">${T('Контакт — приватно','Contact — private')}<input id="profile-contact" value="${e(state.profile.contact)}" maxlength="120"><small>${T('Не отображается в публичных карточках.','Not shown on public cards.')}</small></label><button class="button" type="submit">${T('Сохранить','Save')}</button></form>${link(T('Отмена','Cancel'),'profile','secondary')}`;
V.pet=()=>`<h1>${e(state.profile.petName)}</h1><img class="animal-photo large" src="assets/cat.png" alt="${T('Фото питомца','Pet photo')}"><span class="badge mt">${T('Мой питомец','My pet')}</span><div class="card mt"><h3>${T('На всякий случай','For peace of mind')}</h3><p>${T('Приметы, документы и чип доступны в одном месте.','Features, documents and chip are in one place.')}</p></div><div class="stack">${link(T('Сообщить о пропаже','Report missing'),'lost-report','')}${link(T('Приметы и ID','Features and ID'),'edit-pet','secondary')}${link(T('Документы','Documents'),'documents','secondary')}${button(T('Бирка с QR: подготовить данные','QR tag: prepare details'),'pet-qr','secondary')}</div>`;
V['edit-pet']=()=>`<h1>${T('Данные питомца','Pet details')}</h1><form id="pet-form"><label class="field">${T('Имя питомца','Pet name')}<input id="pet-name" value="${e(state.profile.petName)}" required maxlength="60"></label><label class="field">${T('Номер чипа — приватно','Chip number — private')}<input id="pet-chip" value="${e(state.profile.chip)}" maxlength="30"></label><label class="field">${T('Прививки','Vaccinations')}<textarea id="pet-vaccines" maxlength="500">${e(state.profile.vaccines)}</textarea></label><label class="field">${T('Паспорт / примечание','Passport / note')}<textarea id="pet-passport" maxlength="500">${e(state.profile.passport)}</textarea></label><button class="button" type="submit">${T('Сохранить','Save')}</button></form>`;
V.documents=()=>`<h1>${T('Документы питомца','Pet documents')}</h1><div class="stack">${row(T('Чип','Chip'),'document','shield',state.profile.chip?T('Номер сохранён приватно','Number saved privately'):T('Не указан','Not provided'))}${row(T('Прививки и паспорт','Vaccinations and passport'),'document','grid',T('Сведения','Details'))}</div>${hint(T('Запись здесь не является подтверждением из государственного реестра. Интеграция не подключена.','This entry is not verification from a government registry. No integration is connected.'))}${link(T('Обновить данные','Update details'),'edit-pet','')}`;
V.document=()=>`<h1>${T('Приватные сведения','Private records')}</h1><div class="card"><p>${T('Чип:','Chip:')} ${e(state.profile.chip)||T('не указан','not provided')}</p><p>${T('Прививки:','Vaccinations:')} ${e(state.profile.vaccines)||T('нет сведений','no records')}</p><p>${T('Паспорт:','Passport:')} ${e(state.profile.passport)||T('нет сведений','no records')}</p></div>${link(T('Редактировать','Edit'),'edit-pet','')}`;
const awardData=()=>[{id:'first',title:T('Первый подхват','First helping hand'),rule:T('Опубликовать случай с подтверждёнными данными','Publish a case with confirmed details')},{id:'agreement',title:T('Помощь согласована','Help agreed'),rule:T('Получить подтверждение задачи от помощника','Receive helper confirmation for a task')},{id:'closed',title:T('История сохранена','Story saved'),rule:T('Закрыть случай с указанным итогом','Close a case with a recorded outcome')}];
V.awards=()=>`<h1>${T('Награды за полезные шаги','Awards for useful steps')}</h1><span class="badge lime">${T('Уровень','Level')} ${1+Object.keys(state.awards).length}</span><p class="muted mt">${T('Никаких наград за риск, скорость или ежедневные серии.','No rewards for risk, speed or daily streaks.')}</p>${awardData().map(a=>`<button class="card card-link" data-action="award:${a.id}"><div class="row"><span class="award-icon ${state.awards[a.id]?'':'locked'}">${I('check')}</span><h3>${a.title}</h3></div><p>${a.rule}</p><progress value="${state.awards[a.id]?1:0}" max="1" aria-label="${state.awards[a.id]?1:0} / 1"></progress><span class="caption">${state.awards[a.id]?T('Получено','Earned'):T('0 из 1','0 of 1')}</span></button>`).join('')}`;
V.award=()=>{const a=awardData().find(a=>a.id===awardId)||awardData()[0];return `<h1>${a.title}</h1><div class="award-icon ${state.awards[a.id]?'':'locked'}" style="width:100px;height:100px">${I('check')}</div><div class="card mt"><h3>${T('Условие','Condition')}</h3><p>${a.rule}</p><p>${state.awards[a.id]?new Date(state.awards[a.id]).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow'}):T('Пока не получено','Not earned yet')}</p></div>${link(T('Продолжить помогать','Continue helping'),'home','')}`};
V.favorites=()=>`<h1>${T('Избранное по группам','Saved items by group')}</h1>${state.favorites.map(f=>{const h=helpers.find(h=>h.id===f.objectId);return `<div class="card"><div class="split"><h3>${h?(lang==='ru'?h.name:h.en):T('Карточка животного','Animal card')}</h3>${ib('trash','unfavorite:'+f.type+':'+f.objectId,T('Удалить из избранного','Remove saved item'))}</div><p class="caption">${({person:T('Человек','Person'),organization:T('Организация','Organization'),service:T('Услуга','Service'),animal:T('Животное','Animal')})[f.type]}</p>${h?button(T('Открыть','Open'),'helper:'+h.id,'secondary'):link(T('Открыть карточку','Open card'),f.objectId==='nearby1'?'nearby-case':'animal','secondary')}</div>`}).join('')||hint(T('Сохраняйте людей, организации, услуги и животных.','Save people, organizations, services and animals.'))}`;
V.settings=()=>`<h1>${T('Настройки','Settings')}</h1><div class="card"><h3>${T('Внешний вид','Appearance')}</h3>${button(theme==='light'?T('Включить тёмную тему','Use dark theme'):T('Включить светлую тему','Use light theme'),'theme','secondary')}${button(T('Язык: русский → English','Language: English → русский'),'language','secondary')}${[['reduceMotion',T('Уменьшить движение','Reduce motion')],['reduceTransparency',T('Уменьшить прозрачность','Reduce transparency')],['increaseContrast',T('Усилить контраст','Increase contrast')]].map(([id,n])=>`<label class="check"><input type="checkbox" data-pref="${id}" ${state.prefs[id]?'checked':''}>${n}</label>`).join('')}</div><div class="card"><h3>${T('Приватность','Privacy')}</h3><p>${T('Контакты скрыты по умолчанию. Согласие задаётся отдельно для каждого диалога.','Contacts are private by default. Consent is set for each conversation.')}</p>${link(T('Согласие текущего диалога','Current conversation consent'),'consent','secondary')}</div>${button(T('Сбросить данные','Reset data'),'reset','danger')}`;
V.media=()=>{const items=[{src:current().photo||'assets/dog.png',label:name(current()),synthetic:current().synthetic},{src:'assets/cat.png',label:T('Кошка · дополнительное фото','Cat · additional local photo'),synthetic:true}];const m=items[mediaIndex];return `<h1>${T('Фото','Photos')} ${mediaIndex+1} / ${items.length}</h1><img class="viewer-img" src="${e(m.src)}" alt="${e(m.label)}"><p class="mt">${e(m.label)}</p><div class="action-row mt">${button(T('Предыдущее','Previous'),'media-prev','secondary')}${button(T('Следующее','Next'),'media-next','secondary')}</div>`};
V.scanner=()=>`${scope()}<h1>${T('ID-слепок признаков','Identifying feature record')}</h1><div class="scout-card"><h3>${T('Структурированная запись','Structured record')}</h3><p>${T('Вид, окрас, габариты, особые приметы и подтверждённые сведения собираются в один профиль.','Species, colour, size, distinctive features and confirmed information form one record.')}</p></div>${hint(T('Уникальный биометрический отпечаток не вычисляется. Точность такого метода нужно исследовать отдельно.','No unique biometric fingerprint is calculated. Such a method requires separate validation.'))}${link(T('Подтвердить признаки','Confirm features'),'edit-animal','')}${link(T('Сверить объявления','Compare listings'),'matches','secondary')}`;
let componentState='default';V.states=()=>`<h1>${T('Контракт состояний','State contract')}</h1><div class="tab-filter">${['default','loading','empty','error','attention','closed'].map(v=>`<button data-action="component-state:${v}" class="${componentState===v?'active':''}">${v}</button>`).join('')}</div><div class="card state-demo ${componentState}" aria-busy="${componentState==='loading'}">${componentState==='loading'?'<div class="skeleton"></div><div class="skeleton"></div>':componentState==='empty'?hint(T('Нет данных. Добавьте запись.','No data. Add a record.')):componentState==='error'?`<p class="error">${T('Не удалось загрузить. Сохранённые данные остаются.','Could not load. Saved details remain available.')}</p>${button(T('Повторить','Retry'),'state-retry','secondary')}`:componentState==='attention'?`<span class="badge attention">${I('info')}${T('Нужно внимание','Needs attention')}</span><p>${T('Подтвердите место животного.','Confirm the animal’s location.')}</p>`:componentState==='closed'?`<span class="badge closed">${I('check')}${T('Закрыт','Closed')}</span><p>${T('Только чтение. Обновления истории отдельно.','Read-only. History updates are separate.')}</p>`:`<h3>${T('Карточка случая','Case card')}</h3><p>${T('Подтверждённые данные и следующее действие.','Confirmed details and next action.')}</p>`}</div>${hint(T('Состояния применяются по смыслу. Например, closed у чата означает read-only, а не исчезновение истории.','States are semantic. For example, closed means read-only in a chat, not disappearance of history.'))}`;
function tabFor(id){return ['nearby','nearby-case','offer'].includes(id)?'nearby':['helpers','helper','tasks','chats','chat','consent','call','video'].includes(id)?'chats':['case','cases','route','animal','edit-animal','matches','match','flyer','channels','close','new-case','media','scanner'].includes(id)?'case':'home'}
function header(){const c=current(),top=['home','nearby','case','chats'].includes(screen);return `<header class="app-header">${top?`<button class="avatar" data-go="profile" aria-label="${T('Открыть профиль','Open profile')}">${e(state.profile.name.slice(0,2).toUpperCase())}</button>`:ib('back','back',T('Назад','Back'))}<div class="header-center">${top?T('Подхват','Podhvat'):e(lang==='ru'?SCREEN_REGISTRY.find(s=>s[0]===screen)?.[1]:SCREEN_REGISTRY.find(s=>s[0]===screen)?.[2])}<small>${T('Текущий случай','Current case')} #${c.number}</small></div>${top?ib('grid','go-cases',T('Переключить случай','Switch case')):ib('user','go-profile',T('Профиль','Profile'))}</header>`}
function dock(){return `<nav class="dock" aria-label="${T('Главные разделы','Main sections')}">${[['home','home',T('Главная','Home')],['nearby','map',T('Рядом','Nearby')],['case','grid',T('Случай','Case')],['chats','chat',T('Связь','Connect')]].map(([id,n,label])=>`<button data-go="${id}" class="${tabFor(screen)===id?'active':''}" ${tabFor(screen)===id?'aria-current="page"':''}>${I(n)}<span>${label}</span></button>`).join('')}</nav>`}
function composer(){if(!['chat','scout'].includes(screen)||screen==='chat'&&current().lifecycle==='closed')return '';return `<button class="chat-jump hidden" id="chat-jump" data-action="jump-latest">${T('К последнему','Latest message')}</button><form class="composer" id="message-form">${ib('photo','attach-message',T('Фото, голос и видео','Photo, voice and video'))}<input id="message-input" aria-label="${T('Сообщение','Message')}" placeholder="${T('Напишите сообщение','Type a message')}" maxlength="1000"><button class="icon-button" type="submit" id="send-message" disabled aria-label="${T('Отправить','Send')}">${I('arrow')}</button>${screen==='scout'&&scoutBusy?ib('close','stop-scout',T('Остановить ответ','Stop response')):''}</form>`}
function applyPrefs(){document.body.classList.toggle('dark',theme==='dark');document.body.classList.toggle('reduce-motion',state.prefs.reduceMotion);document.body.classList.toggle('reduce-transparency',state.prefs.reduceTransparency);document.body.classList.toggle('increase-contrast',state.prefs.increaseContrast);document.documentElement.lang=lang;document.getElementById('language').textContent=lang==='ru'?'EN':'RU';document.getElementById('theme').textContent=theme==='light'?T('Тёмная тема','Dark theme'):T('Светлая тема','Light theme')}
function render(focus=false){applyPrefs();const withComposer=['chat','scout'].includes(screen)&&!(screen==='chat'&&current().lifecycle==='closed');app.innerHTML=`<section class="screen ${withComposer?'has-composer':''}">${header()}<div class="scroll-content" tabindex="0" aria-label="${T('Содержимое экрана','Screen content')}">${V[screen]?V[screen]():V.home()}</div>${composer()}${dock()}</section>`;const area=app.querySelector('.scroll-content');area.scrollTop=offsets[screen+':'+state.current]||0;area.addEventListener('scroll',()=>{offsets[screen+':'+state.current]=area.scrollTop;chatFollow=area.scrollHeight-area.scrollTop-area.clientHeight<64;document.getElementById('chat-jump')?.classList.toggle('hidden',chatFollow)});if(withComposer&&chatFollow)area.scrollTop=area.scrollHeight;
document.getElementById('screen-nav').innerHTML=SCREEN_REGISTRY.map(([id,ru,en])=>`<button data-go="${id}" class="${id===screen?'active':''}">${lang==='ru'?ru:en}</button>`).join('');const s=SCREEN_REGISTRY.find(x=>x[0]===screen);document.getElementById('inspector').innerHTML=`<h2>${e(lang==='ru'?s[1]:s[2])}</h2><p>${e(s[4])}</p><dl><dt>Screen ID</dt><dd>${screen}</dd><dt>${T('Текущий случай','Current case')}</dt><dd>#${current().number}</dd><dt>${T('Состояние','State')}</dt><dd>${current().lifecycle} / ${current().urgency}</dd></dl>`;if(focus){const h=area.querySelector('h1,h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}}}
function stopPending(){if(scoutTimer){clearTimeout(scoutTimer);scoutTimer=null;scoutBusy=false}if(prototypeLoading){clearTimeout(prototypeLoading);prototypeLoading=null}}
function go(id,push=true){if(!V[id])return;if(screen==='scout'&&id!=='scout')stopPending();if(push&&id!==screen)navHistory.push({screen,caseId:state.current});if(id==='triage'&&state.triageCaseId!==state.current){state.triage={index:0,answers:[],result:null};state.triageCaseId=state.current}screen=id;history.replaceState(null,'','#'+id);render(true)}
function toast(s){document.getElementById('toast').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>document.getElementById('toast').textContent='',4500)}
function openModal(title,body,actions){modalFocus=document.activeElement;modal.innerHTML=`<h2>${title}</h2><p>${body}</p><div class="stack">${actions}</div>`;modal.showModal()}function closeModal(){modal.close();modalFocus?.focus({preventScroll:true})}modal.addEventListener('cancel',()=>modalFocus?.focus({preventScroll:true}));
function newCase(group='domestic',species='dog',place=''){const next=Math.max(240,...state.cases.map(c=>Number(c.number)))+1;const c={...structuredClone(initial.cases[0]),id:'c'+next,number:String(next).padStart(4,'0'),group,species,lifecycle:'draft',urgency:'ongoing',name:species==='cat'?T('Найденная кошка','Found cat'):T('Новое животное','Found animal'),nameEN:species==='cat'?'Found cat':'Found animal',publicPlace:place||T('Место уточняется','Location to be confirmed'),privatePlace:'',photo:null,synthetic:false,step:0,features:'',featuresEN:'',color:'unknown',sex:'unknown',size:'unknown',log:[],updates:[],tasks:[],chats:{},consents:{},carePassed:false,intakeConfirmed:false,finderPresent:true,lastConfirmed:!!place,foundAt:new Date().toISOString(),outcome:null};state.cases.push(c);state.current=c.id;state.triage={index:0,answers:[],result:null};state.triageCaseId=c.id;addLog('Создан черновик','Draft created',c);return c}
function demo(kind){stopPending();const group=kind==='wild'?'wild':kind==='farm'?'farm':'domestic';const c=newCase(group,group==='domestic'?'dog':'other',T('Примерный район','Approximate area'));c.photo=group==='domestic'?'assets/dog.png':null;c.synthetic=group==='domestic';c.lifecycle='published';c.step=kind==='normal'?2:0;c.urgency=kind==='urgent'?'urgent':'ongoing';persist();go(kind==='urgent'||restricted(c)?'emergency':'case')}
function runTriage(value){const q=state.triage;q.answers[q.index]=value;const urgent=(q.index<3&&value==='yes')||(q.index===3&&value==='yes');if(urgent){q.result='urgent';current().urgency='urgent';persist();go('emergency');return}if(q.index<5){q.index++;persist();render();return}q.result=q.answers.some(x=>x==='unknown')||q.answers[4]!=='yes'||q.answers[5]!=='yes'?'attention':'ongoing';current().urgency=q.result;current().step=Math.max(current().step,1);addLog('Первичная оценка сохранена','Initial assessment saved');go('triage-result')}
function ensureChat(id=helperId){const c=current();if(!c.chats[id])c.chats[id]=[{role:'system',text:'Диалог привязан к случаю #'+c.number,en:'Conversation belongs to case #'+c.number,at:new Date().toISOString()}];persist()}
function requestHelper(){const c=current(),h=helper();if(c.lifecycle==='closed'){toast(T('Закрытый случай нельзя изменить.','Closed cases cannot be modified.'));return}if(restricted(c)&&h.type!=='specialist'){toast(T('Для этой группы нужен специалист.','This group needs a specialist.'));return}ensureChat();if(!c.tasks.some(x=>x.helperId===h.id&&x.status!=='completed'))c.tasks.push({id:'t'+Date.now(),helperId:h.id,type:restricted(c)?'observe':h.type,title:restricted(c)?'Наблюдение и связь со специалистом':'Запрос помощи',titleEN:restricted(c)?'Observation and specialist contact':'Help request',status:'offered',deadline:''});if(c.lifecycle==='draft')c.lifecycle='published';c.step=Math.max(c.step,3);addLog('Создан локальный запрос помощнику','Local helper request created');go('chat');toast(T('Запрос сохранён локально. Реальное сообщение не отправлялось.','Request saved locally. No real message was sent.'))}
function postMessage(text){const c=current();if(screen==='chat'&&c.lifecycle==='closed')return;if(!text.trim())return;if(screen==='chat'){ensureChat();c.chats[helperId].push({role:'self',text:text.trim(),en:text.trim(),at:new Date().toISOString()});persist();refreshMessages();return}if(scoutBusy)return;state.scoutMessages.push({caseId:c.id,role:'self',text:text.trim(),en:text.trim(),at:new Date().toISOString()});scoutBusy=true;persist();render();scoutTimer=setTimeout(()=>{scoutTimer=null;scoutBusy=false;const answer=restricted(c)?['Наблюдайте издалека. Не пытайтесь поймать животное. Свяжитесь с подходящим специалистом.','Observe from a distance. Do not try to catch the animal. Contact an appropriate specialist.']:c.urgency==='urgent'?['Сейчас важны безопасность и специалист. Опишите видимые признаки, не приближаясь ради проверки.','Safety and a specialist matter now. Describe visible signs without approaching to check.']:['Зафиксируйте приметы и место. Затем проверим совпадения и найдём помощника.','Record features and location. Then check possible matches and find a helper.'];state.scoutMessages.push({caseId:c.id,role:'scout',text:answer[0],en:answer[1],at:new Date().toISOString()});persist();if(screen==='scout'&&state.current===c.id){refreshMessages();toast(T('Ответ Скаута готов','Scout local response is ready'))}},900)}
function refreshMessages(){const area=app.querySelector('.scroll-content'),follow=area.scrollHeight-area.scrollTop-area.clientHeight<64;const m=document.getElementById(screen==='chat'?'chat-messages':'scout-messages');if(m)m.innerHTML=screen==='chat'?bubbles(messages()):bubbles(state.scoutMessages.filter(m=>m.caseId===state.current));if(screen==='scout'&&!scoutBusy){const next=document.createElement('div');next.className='mt';next.innerHTML=link(T('Следующее действие','Next action'),restricted()||current().urgency==='urgent'?'helpers':'edit-animal','');m?.appendChild(next);app.querySelector('[data-action="stop-scout"]')?.remove()}if(follow)area.scrollTop=area.scrollHeight;else document.getElementById('chat-jump')?.classList.remove('hidden');const b=document.getElementById('send-message');if(b)b.disabled=!document.getElementById('message-input')?.value.trim()}
function exportFlyer(){const c=current();const text=[T('Найдено животное','Animal found'),name(c),'#'+c.number,T('Примерный район:','Approximate area:')+' '+c.publicPlace,T('Примерная листовка · QR не активирован','Sample flyer · QR not activated')];const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#F3F4F2"/><rect x="40" y="40" width="720" height="920" rx="40" fill="#FFFFFF"/><rect x="72" y="72" width="656" height="190" rx="32" fill="#DBF95B"/>${text.map((s,i)=>`<text x="82" y="${150+i*105}" font-family="Arial,sans-serif" font-size="${i===0?40:24}" fill="#17191B">${e(s)}</text>`).join('')}</svg>`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));a.download='podhvat-case-'+c.number+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.addEventListener('click',event=>{const b=event.target.closest('button,a');if(!b)return;if(b.dataset.go){if(modal.open)closeModal();go(b.dataset.go);return}if(b.dataset.demo){demo(b.dataset.demo);return}const action=b.dataset.action;if(!action)return;const [a,...parts]=action.split(':'),value=parts.join(':');const c=current();switch(a){case'back':{const prev=navHistory.pop();if(prev){state.current=prev.caseId;persist();go(prev.screen,false)}else go('home',false);break}case'go-profile':go('profile');break;case'go-cases':go('cases');break;case'go-consent':go('consent');break;case'urgent':if(c.lifecycle==='closed')newCase();current().urgency='urgent';persist();go('emergency');break;case'new-urgent':newCase(document.getElementById('new-group')?.value||'unknown',document.getElementById('new-species')?.value||'other',document.getElementById('new-place')?.value||'');current().urgency='urgent';persist();go('emergency');break;case'answer':runTriage(value);break;case'triage-back':state.triage.index=Math.max(0,state.triage.index-1);render();break;case'switch':stopPending();state.current=value;persist();go('case');break;case'history':stopPending();state.current=value;persist();go('history-case');break;case'publish':if(c.lifecycle==='draft'){c.lifecycle='published';c.step=2;addLog('Случай опубликован локально','Case published locally');award('first');go('case')}break;case'helper':helperId=value;go('helper');break;case'helper-filter':filter=value;render();break;case'request-helper':requestHelper();break;case'open-chat':helperId=value;go('chat');break;case'match-chat':helperId='claimant';ensureChat();go('chat');break;case'accept-task':{const task=c.tasks.find(x=>x.id===value);if(task&&task.status==='offered'&&c.lifecycle!=='closed'){task.status='assigned';addLog('Помощник подтвердил задачу','Helper accepted the task');award('agreement');render()}break}case'complete-task':{const task=c.tasks.find(x=>x.id===value);if(task&&task.status==='assigned'&&c.lifecycle!=='closed'){task.status='completed';c.step=4;addLog('Задача выполнена локально','Task completed locally');render()}break}case'confirm-intake':if(c.lifecycle!=='closed'&&helper().kind==='organization'){c.intakeConfirmed=true;addLog('Приём организацией подтверждён локально','Organization intake confirmed locally');render()}break;case'consent-self':if(c.lifecycle!=='closed'){c.consents[helperId]={...consent(c),self:!consent(c).self};persist();render()}break;case'consent-peer':if(c.lifecycle!=='closed'){c.consents[helperId]={...consent(c),peer:!consent(c).peer};persist();render();toast(T('Согласие второй стороны изменено локально.','Other party consent changed locally.'))}break;case'end-call':go('chat');break;case'download-flyer':exportFlyer();break;case'prepare-share':{const selected=[...document.querySelectorAll('[name="channel"]:checked')].map(x=>x.value);const target=document.getElementById('share-preview');target.classList.remove('hidden');target.textContent=selected.length?`${selected.join(', ')}: ${T('Найдено животное','Animal found')} #${c.number}. ${T('Примерный район','Approximate area')}: ${c.publicPlace}. ${T('Контакты и точная точка скрыты.','Contacts and exact location are hidden.')}`:T('Выберите хотя бы один канал.','Choose at least one channel.');break}case'article':articleId=value;go('article');break;case'award':awardId=value;go('award');break;case'favorite':{const [type,objectId]=parts;if(!state.favorites.some(x=>x.type===type&&x.objectId===objectId)){state.favorites.push({type,objectId});persist()}toast(T('Сохранено в избранном','Saved to favorites'));break}case'unfavorite':{const [type,objectId]=parts;state.favorites=state.favorites.filter(x=>!(x.type===type&&x.objectId===objectId));persist();render();break}case'nearby-mode':nearbyMode=value;render();break;case'pet-qr':toast(T('Для QR нужна защищённая публичная ссылка. Личные данные не кодируются локально.','QR needs a secure public link. Personal data is not encoded locally.'));break;case'language':lang=lang==='ru'?'en':'ru';render();break;case'theme':theme=theme==='light'?'dark':'light';render();break;case'component-state':componentState=value;render();break;case'state-retry':componentState='loading';render();prototypeLoading=setTimeout(()=>{componentState='default';if(screen==='states')render()},900);break;case'media-prev':mediaIndex=(mediaIndex+1)%2;render();break;case'media-next':mediaIndex=(mediaIndex+1)%2;render();break;case'jump-latest':{const area=app.querySelector('.scroll-content');area.scrollTop=area.scrollHeight;break}case'stop-scout':stopPending();state.scoutMessages.push({caseId:c.id,role:'system',text:'Ответ остановлен. Вы можете задать другой вопрос.',en:'Response stopped. You can ask another question.',at:new Date().toISOString()});persist();refreshMessages();break;case'attach-message':openModal(T('Вложения и голос','Attachments and voice'),T('Текстовый прототип сохраняет сообщения. Фото, голос и видео требуют загрузки файлов, записи и разрешений в native-приложении.','This text prototype saves messages. Photo, voice and video need uploads, recording and permissions in the native app.'),link(T('Фото животного','Animal photo'),'edit-animal','secondary')+button(T('Понятно','Got it'),'dismiss'));break;case'reset':openModal(T('Сбросить данные?','Reset data?'),T('Локальные изменения будут удалены.','Local changes will be removed.'),button(T('Отмена','Cancel'),'dismiss','secondary')+button(T('Сбросить','Reset'),'confirm-reset','danger'));break;case'confirm-reset':stopPending();state=structuredClone(initial);persist();closeModal();navHistory=[];go('home',false);break;case'dismiss':closeModal();break;case'confirm-close':{const outcome=modal.dataset.outcome;c.lifecycle='closed';c.outcome=outcome;c.closedAt=new Date().toISOString();c.step=4;addLog('Случай закрыт: '+outcomes()[outcome],'Case closed: '+outcome);award('closed');closeModal();go('history-case');break}}});
document.addEventListener('input',event=>{if(event.target.id==='message-input'){document.getElementById('send-message').disabled=!event.target.value.trim()||(screen==='scout'&&scoutBusy)}});
document.addEventListener('change',event=>{if(event.target.dataset.pref){state.prefs[event.target.dataset.pref]=event.target.checked;persist();applyPrefs()}});
document.addEventListener('submit',async event=>{const form=event.target;const id=form.id;if(!['new-case-form','animal-form','care-form','offer-form','close-form','update-form','profile-form','pet-form','message-form'].includes(id))return;event.preventDefault();const val=id=>document.getElementById(id)?.value.trim()||'';const c=current();if(id==='new-case-form'){newCase(val('new-group'),val('new-species'),val('new-place'));go('triage');return}if(id==='animal-form'){if(c.lifecycle==='closed')return;c.name=val('animal-name');c.nameEN=c.name;c.sex=val('animal-sex');c.size=val('animal-size');c.color=val('animal-color');c.breed=val('animal-breed');c.weight=val('animal-weight');c.features=val('animal-features');c.featuresEN=c.features;c.tag=val('animal-tag');c.publicPlace=val('animal-place');c.privatePlace=val('animal-private');c.finderPresent=document.getElementById('animal-present').checked;c.lastConfirmed=document.getElementById('animal-confirmed').checked;if(c.urgency!=='urgent'&&(!c.finderPresent||!c.lastConfirmed))c.urgency='attention';const file=document.getElementById('animal-photo').files[0];if(file){if(file.size>5*1024*1024||!file.type.startsWith('image/')){document.getElementById('animal-error').textContent=T('Выберите изображение до 5 МБ.','Choose an image up to 5 MB.');return}c.photo=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(file)});c.synthetic=false}c.step=Math.max(c.step,1);addLog('Приметы и место сохранены','Features and location saved');go('animal');toast(T('Данные сохранены. Черновик публикуется отдельным действием.','Details saved. Publish a draft with a separate action.'));return}if(id==='care-form'){c.carePassed=[...form.querySelectorAll('[name="care"]:checked')].length===3;persist();go('care-result');return}if(id==='offer-form'){state.nearbyTasks.push({caseId:'nearby1',type:val('offer-type'),deadline:val('offer-time'),status:'offered'});persist();go('tasks');toast(T('Предложение сохранено локально.','Offer saved locally.'));return}if(id==='close-form'){if(c.lifecycle==='closed')return;const outcome=form.querySelector('[name="outcome"]:checked')?.value;const err=document.getElementById('close-error');if(outcome==='organization'&&!c.intakeConfirmed){err.textContent=T('Сначала получите подтверждение приёма организацией в задачах.','Get organization intake confirmation in tasks first.');return}if(outcome==='foster'&&!c.carePassed){err.textContent=T('Сначала согласуйте план передержки.','Agree a foster care plan first.');return}if(restricted(c)&&outcome==='foster'){err.textContent=T('Для этой группы передержку согласует специалист.','A specialist directs care for this group.');return}openModal(T('Закрыть случай?','Close this case?'),T('Итог сохранится, все диалоги этого случая станут архивными.','The outcome will be saved and all case conversations become archived.'),button(T('Продолжить случай','Keep case open'),'dismiss','secondary')+button(T('Закрыть с этим итогом','Close with this outcome'),'confirm-close'));modal.dataset.outcome=outcome;return}if(id==='update-form'){c.updates.push({text:val('history-update'),at:new Date().toISOString(),isNew:true});c.lastUpdatedAt=new Date().toISOString();persist();go('history-case');return}if(id==='profile-form'){state.profile.name=val('profile-name');state.profile.contact=val('profile-contact');persist();go('profile');return}if(id==='pet-form'){state.profile.petName=val('pet-name');state.profile.chip=val('pet-chip');state.profile.vaccines=val('pet-vaccines');state.profile.passport=val('pet-passport');persist();go('pet');return}if(id==='message-form'){const input=document.getElementById('message-input'),text=input.value;if(text.trim()){input.value='';postMessage(text)}}});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(V[id]&&id!==screen)go(id,false)});window.podhvat={go,current,helpers,state:()=>state,renderAll:()=>Object.keys(V).map(id=>({id,html:V[id]()})),setLanguage:x=>{lang=x;render()},setTheme:x=>{theme=x;render()},getCopy:()=>({ru:copyRU,en:copyEN})};if(V[location.hash.slice(1)])screen=location.hash.slice(1);render();

SCREEN_REGISTRY.push(['lost-report','Сообщить о пропаже','Report a missing pet','Профиль','Случай владельца: место последнего наблюдения, питомец и сверка находок.']);
V['lost-report']=()=>`<h1>${T('Пропал питомец','A pet is missing')}</h1><div class="card"><h3>${e(state.profile.petName)}</h3><p>${T('Данные питомца будут связаны с отдельным случаем поиска.','Pet details will be linked to a separate search case.')}</p></div><form id="lost-form"><label class="field">${T('Где видели в последний раз','Where last seen')}<input id="lost-location" required maxlength="100"></label><button class="button" type="submit">${T('Создать случай поиска','Create search case')}</button></form>`;
document.addEventListener('submit',event=>{if(event.target.id!=='lost-form')return;event.preventDefault();const c=newCase('domestic','cat',document.getElementById('lost-location').value.trim());c.origin='lost';c.lifecycle='published';c.name=state.profile.petName;c.nameEN=c.name;c.photo='assets/cat.png';c.synthetic=true;c.step=2;c.features=state.profile.passport;c.featuresEN=c.features;addLog('Создан случай поиска питомца','Missing-pet search case created');go('matches')});
render();

const baseHelperView=V.helper;V.helper=()=>baseHelperView()+button(T('Сохранить услугу','Save service'),'favorite:service:'+helperId,'secondary')+(helper().kind==='organization'?button(current().intakeConfirmed?T('Приём подтверждён локально','Intake confirmed locally'):T('Имитировать отдельное подтверждение приёма','Simulate separate intake confirmation'),'confirm-intake','secondary'):'');
const baseTriageView=V.triage;V.triage=()=>current().lifecycle==='closed'?hint(T('Закрытый случай не переоценивается. Создайте новый при необходимости.','Closed cases are not reassessed. Create a new case if needed.'))+link(T('Новая находка','New finding'),'new-case',''):baseTriageView();
const baseCloseView=V.close;V.close=()=>current().lifecycle==='draft'?hint(T('Сначала опубликуйте случай или сохраните его как черновик.','Publish the case first or keep it as a draft.'))+link(T('Открыть описание','Open description'),'edit-animal',''):baseCloseView();
const baseCareView=V.care;V.care=()=>current().lifecycle==='closed'?hint(T('Случай закрыт. Добавьте отдельное обновление истории.','Case closed. Add a separate history update.'))+link(T('Добавить обновление','Add update'),'update',''):baseCareView();
const baseUpdateView=V.update;V.update=()=>current().lifecycle!=='closed'?hint(T('Обновления истории доступны после закрытия. Для активного случая используйте журнал и диалог.','History updates are available after closure. Use the log and conversation for active cases.'))+link(T('Вернуться к случаю','Back to case'),'case',''):baseUpdateView();
const baseMatchesView=V.matches;V.matches=()=>current().origin==='lost'?baseMatchesView().replace(T('Похожее объявление','Similar listing'),T('Похожая находка','Similar finding')):baseMatchesView();
render();

/* ===== src/js/02-review-v2.js ===== */
// Continuous, local product walkthrough. No network or real publication.
const walkthrough=document.body.dataset.start==='true';
const savedCurrent=current, savedRender=render, savedDock=dock, savedHeader=header;
const blankCase={...structuredClone(initial.cases[0]),id:null,number:'',lifecycle:'empty',photo:null,tasks:[],chats:{},consents:{},log:[],updates:[]};
current=()=>state.cases.find(c=>c.id===state.current)||blankCase;
if(walkthrough||!state.reviewInitialized){state=structuredClone(initial);state.cases=[];state.current=null;state.awards={};state.reviewInitialized=true;state.onboarded=false;state.scoutMessages=[];}
persist=()=>localStorage.setItem(walkthrough?'podhvat-walkthrough-v2':'podhvat-state-v2',JSON.stringify(state));persist();
const fixedIcons={user:'<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21"/>',chat:'<path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5H8l-5.5 2 1.8-5.2A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8 9h8M8 13h5"/>',heart:'<path d="M20.3 4.7a5.2 5.2 0 0 0-7.3 0L12 5.8l-1.1-1.1a5.2 5.2 0 0 0-7.3 7.3L12 20.5l8.4-8.5a5.2 5.2 0 0 0-.1-7.3Z"/>',settings:'<path d="M9 3h6l1 3 3 1 2 3-2 2v3l-3 1-1 5H9l-1-5-3-1v-3l-2-2 2-3 3-1Z"/><circle cx="12" cy="12" r="3"/>'};Object.assign(ICON_PATHS,fixedIcons);
scope=()=>'';
const oldNextId=nextId,oldNextLabel=nextLabel;
nextId=(c=current())=>c.lifecycle==='draft'&&c.step===0?'triage':oldNextId(c);
nextLabel=(c=current())=>c.lifecycle==='closed'?'Посмотреть историю':c.lifecycle==='draft'&&c.step>0?'Зафиксировать приметы':oldNextLabel(c);
const introIds=['welcome','intro-help','intro-privacy'];
for(const [id,title] of [['splash','Запуск'],['intro-help','Маршрут помощи'],['intro-privacy','Приватность']])SCREEN_REGISTRY.push([id,title,title,'Начало','Последовательное знакомство с приложением.']);
const art=()=>'<img src="assets/scout.png" alt="Скаут — ваш ИИ-помощник">';
const emotional=text=>`<div class="emotional-scout">${art()}<p>${text}</p></div>`;
const intro=(i,title,copy)=>`<button class="onboarding-skip" data-review="finish">Пропустить</button><div class="onboarding-art">${art()}</div><h1>${title}</h1><p class="intro-copy">${copy}</p><div class="onboarding-bottom"><div class="onboarding-dots" role="img" aria-label="Слайд ${i+1} из ${introIds.length}">${introIds.map((_,n)=>`<i class="${i===n?'active':''}"></i>`).join('')}</div><div class="onboarding-arrows"><button ${i?`data-go="${introIds[i-1]}"`:'disabled'} aria-label="Назад">${I('arrow')}</button><button class="next" ${i===2?'data-review="finish"':`data-go="${introIds[i+1]}"`} aria-label="${i===2?'Начать':'Далее'}">${I('arrow')}</button></div></div>`;
V.splash=()=>`<div class="loading-content">${art()}<h1>Подхват</h1><p>Помощь начинается с одного шага</p><div class="loading-track" role="progressbar" aria-label="Загрузка приложения"><i></i></div><button class="button secondary" data-review="boot">Продолжить</button></div>`;
V.welcome=()=>intro(0,'Я Скаут.<br>Я рядом.','Если вы нашли животное, я помогу разобраться и выбрать следующий шаг.');
V['intro-help']=()=>intro(1,'Один случай.<br>Один маршрут.','Оценим ситуацию, сохраним приметы и найдём помощь. При срочности сразу перейдём к специалисту.');
V['intro-privacy']=()=>intro(2,'Помогаем.<br>Бережно.','Точная точка и контакты остаются приватными. Вы сами решаете, кому и когда их открыть.');
const emptyView=()=>`<div class="empty-case-card"><h2>Пока нет созданного случая</h2><p>Если вы встретили животное, начнём с безопасности. Не нужно заранее знать, что делать.</p>${link('Нашёл животное','new-case','')}${button('Нужна срочная помощь','urgent','secondary')}</div>`;
const guide=()=>`<div class="scout-intro"><img class="scout-portrait" src="assets/scout.png" alt="Скаут"><h1>${state.cases.length?'Вы уже<br>не одни.':'Подхватим<br>вместе.'}</h1><p>${state.cases.length?'Я Скаут. Веду ваш случай и помогу с ближайшим шагом.':'Я Скаут. Помогу вам и животному — шаг за шагом.'}</p><button class="ask-scout" data-go="scout">Поговорить со Скаутом ${I('arrow')}</button></div>`;
const stage=(c,detail=false)=>`<div class="case-stage"><div class="card">${photo(c,detail)}<div class="case-head"><h3 class="case-name">${e(name(c))}</h3>${status(c)}</div><p class="caption">${e(c.publicPlace)} · #${c.number}</p><div class="case-next"><small>Следующий шаг · ${Math.min(c.step+1,5)} / 5</small><h3>${e(nextLabel(c))}</h3><div class="progress">${[0,1,2,3,4].map(i=>`<i class="${i<=c.step?'done':''}"></i>`).join('')}</div>${link('Продолжить',nextId(c),'')}</div></div></div>`;
V.home=()=>guide()+(state.cases.length?stage(current())+`<div class="action-row">${link('Новая находка','new-case','secondary')}${link('Все случаи','cases','secondary')}</div><button class="stage-preview" data-go="route">${I('grid')}<span>Маршрут помощи<small>Все этапы вашего случая</small></span>${I('arrow')}</button>`:emptyView())+`<div class="soft-scout-note">${art()}<p>Можно начать с малого. Посмотреть, кому нужна помощь рядом.</p></div>${link('Посмотреть рядом','nearby','secondary')}`;
V.case=()=>!state.cases.length?emotional('Ваш случай появится здесь. Я помогу пройти весь путь.')+emptyView():`<div class="case-heading"><h1>Ваш случай</h1>${ib('heart','favorite:animal:'+current().id,'Сохранить животное')}</div>${stage(current(),true)}<div class="detail-traits"><div><small>Этап</small><strong>${Math.min(current().step+1,5)} / 5</strong></div><div><small>Помощники</small><strong>${current().tasks.length}</strong></div><div><small>Присутствие</small><strong>${current().finderPresent?'Рядом':'Уточнить'}</strong></div></div><div class="detail-forecast"><div class="split"><span>Маршрут помощи</span>${ib('arrow','review-route','Открыть маршрут')}</div><div class="forecast-bars">${[22,38,54,46,30].map((h,i)=>`<i style="height:${h}px;opacity:${i<=current().step?1:.35}"></i>`).join('')}</div><small>Пять этапов · текущий подсвечен</small></div><div class="stack mt">${row('Фото и приметы','animal','photo')}${row('Помощники','helpers','user')}${row('Задачи и договорённости','tasks','check')}${row('Возможные совпадения','matches','search')}${row('Зафиксировать итог','close','heart')}</div>`;
let selectedPin='animal',mapFeed=false;
const feedView=V.nearby;
V.nearby=()=>mapFeed?`<button class="button secondary" data-review="map">Карта ${I('map')}</button>`+feedView().replace(/<div class="tab-filter">[\s\S]*?<\/div>/,''):`<div class="map-gradient"></div><div class="map-chrome"><button class="icon-button map-view-toggle" data-review="feed" aria-label="Показать список" title="Показать список">${I('grid')}</button><div class="map-city">Городской парк<small>Схема района</small></div><button class="icon-button" data-review="feed" aria-label="Открыть ленту">${I('search')}</button></div><button class="icon-button map-center" data-review="center" aria-label="Центрировать карту">${I('target')}</button>${[[24,35],[58,46],[78,29],[38,59]].map(([x,y],i)=>`<button class="map-pin ${selectedPin===(i?'helper':'animal')?'selected':''}" style="left:${x}%;top:${y}%" data-review="pin:${i?'helper':'animal'}" aria-label="${i?'Помощник':'Животное'} на схеме"></button>`).join('')}<div class="map-selected"><div class="split"><img class="mini-photo" src="assets/${selectedPin==='animal'?'cat':'scout'}.png" alt="${selectedPin==='animal'?'Кошка':'Скаут'}"><div><h3>${selectedPin==='animal'?'Помочь с поиском':'Помощники рядом'}</h3><small>${selectedPin==='animal'?'Около парка':'Волонтёры и организации'}</small></div>${I('arrow')}</div>${link('Подробнее',selectedPin==='animal'?'nearby-case':'helpers','')}</div>`;
const previousScout=V.scout;V.scout=()=>`<div class="scout-chat-cover">${art()}<div><h1>Скаут</h1><p>Один шаг за раз.<br>Я здесь, чтобы помочь.</p></div></div>`+previousScout().replace(/<div class="scout-top">[\s\S]*?<\/div><\/div>/,'');
for(const id of ['emergency','triage-result','care-result','history-case','awards']){const original=V[id];V[id]=()=>emotional(id==='emergency'?'Сейчас главное — ваша безопасность и связь со специалистом. Я помогу найти нужный контакт.':id==='awards'?'Каждый спокойный и ответственный шаг имеет значение.':id==='history-case'?'Ваши действия уже стали частью этой истории.': 'Давайте двигаться спокойно. Следующий шаг — ниже.')+original();}
const dependent=['route','animal','edit-animal','triage','triage-result','matches','match','flyer','channels','care','care-result','tasks','chat','consent','call','video','close','history-case','update','media','scanner'];
for(const id of dependent){const original=V[id];V[id]=()=>state.cases.length?original():emotional('Начнём с вашей ситуации. Для этого сначала создайте случай.')+emptyView();}
header=()=>['home','case','nearby','scout'].includes(screen)?`<header class="app-header"><button class="icon-button" data-go="settings" aria-label="Настройки">${I('settings')}</button><div class="header-center">${screen==='home'?'Подхват':'Подхват'}</div><button class="icon-button" data-go="profile" aria-label="Профиль">${I('user')}</button></header>`:savedHeader();
dock=()=>['splash',...introIds].includes(screen)?'':savedDock();
render=(focus=false)=>{savedRender(focus);const s=app.querySelector('.screen');s.classList.toggle('review-air',['home','case'].includes(screen));s.classList.toggle('onboarding-screen',introIds.includes(screen));s.classList.toggle('map-screen',screen==='nearby'&&!mapFeed);if(screen==='splash'){s.classList.add('loading-screen');s.innerHTML=V.splash();}if(introIds.includes(screen)){s.querySelector('.scroll-content').insertAdjacentHTML('beforeend','');} };
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-review],[data-action="urgent"],[data-action="review-route"],[data-action="confirm-reset"]');if(!b)return;let a=b.dataset.review;if(b.dataset.action==='review-route')a='route';if(b.dataset.action==='urgent'&&!state.cases.length){ev.stopImmediatePropagation();newCase('unknown','other');current().urgency='urgent';persist();go('emergency');return;}if(b.dataset.action==='confirm-reset'){ev.stopImmediatePropagation();stopPending();state=structuredClone(initial);state.cases=[];state.current=null;state.reviewInitialized=true;state.onboarded=false;persist();closeModal();go('welcome');return;}if(!a)return;ev.preventDefault();ev.stopImmediatePropagation();if(a==='boot')go(state.onboarded?'home':'welcome');if(a==='finish'){state.onboarded=true;persist();go('home');}if(a==='feed'){mapFeed=true;nearbyMode='list';render();}if(a==='map'){mapFeed=false;render();}if(a==='center'){selectedPin='animal';render();toast('Схема центрирована. Геолокация не запрашивается локально.');}if(a.startsWith('pin:')){selectedPin=a.slice(4);render();}if(a==='route')go('route');},true);
window.podhvat.go=(...args)=>go(...args);window.podhvat.current=()=>current();window.podhvat.render=()=>render();
const oldRequestHelper=requestHelper;requestHelper=()=>{if(!state.cases.length){toast('Для запроса помощи сначала создайте случай.');go('new-case');return;}oldRequestHelper();};
document.addEventListener('click',ev=>{if(!state.cases.length&&ev.target.closest('[data-action="confirm-intake"]')){ev.stopImmediatePropagation();toast('Подтверждение приёма относится к конкретному случаю.');go('new-case');}},true);
screen='splash';render();setTimeout(()=>{if(screen==='splash')go(state.onboarded?'home':'welcome',false)},1600);

/* ===== src/js/03-flaticon-icons.js ===== */
// Flaticon Uicons. Original glyph outlines; local assets, no CDN.
const FLATICON_PATHS={"arrow": "<path d=\"M23.12 9.92 19.28 6.0Q18.96 5.68 18.560000000000002 5.68Q18.16 5.68 17.84 6.0Q17.52 6.32 17.52 6.720000000000001Q17.52 7.120000000000001 17.84 7.440000000000001L21.36 10.959999999999999H1.04Q0.56 11.04 0.28 11.32Q0.0 11.6 0.0 12.0Q0.0 12.4 0.28 12.719999999999999Q0.56 13.04 0.96 13.04H21.44L17.84 16.64Q17.52 16.88 17.52 17.32Q17.52 17.759999999999998 17.84 18.0Q18.16 18.32 18.560000000000002 18.32Q18.96 18.32 19.28 18.0L23.12 14.16Q24.0 13.28 24.0 12.04Q24.0 10.799999999999999 23.12 9.92Z\"/>", "back": "<path d=\"M17.2 24.0Q16.72 24.0 16.48 23.68L8.32 15.52Q7.6000000000000005 14.799999999999999 7.2 13.879999999999999Q6.8 12.959999999999999 6.8 12.0Q6.8 11.04 7.2 10.12Q7.6000000000000005 9.2 8.32 8.48L16.48 0.3200000000000003Q16.72 0.0 17.16 0.0Q17.6 0.0 17.880000000000003 0.27999999999999936Q18.16 0.5599999999999987 18.16 1.0Q18.16 1.4400000000000013 17.84 1.6799999999999997L9.68 9.84Q8.8 10.719999999999999 8.8 12.0Q8.8 13.28 9.68 14.16L17.92 22.32Q18.16 22.56 18.16 23.0Q18.16 23.44 17.880000000000003 23.72Q17.6 24.0 17.2 24.0Z\"/>", "battery": "<path d=\"M23.04 8.0H21.92Q21.52 6.239999999999998 20.16 5.119999999999999Q18.8 4.0 17.04 4.0H5.04Q3.68 4.0 2.52 4.68Q1.36 5.359999999999999 0.68 6.52Q0.0 7.68 0.0 9.04V14.959999999999999Q0.0 16.32 0.68 17.48Q1.36 18.64 2.52 19.32Q3.68 20.0 5.04 20.0H17.04Q18.8 20.0 20.16 18.88Q21.52 17.759999999999998 21.92 16.0H23.04Q23.44 16.0 23.72 15.719999999999999Q24.0 15.44 24.0 15.04V8.959999999999999Q24.0 8.56 23.72 8.280000000000001Q23.44 8.0 22.96 8.0ZM17.04 18.0H5.04Q3.7600000000000002 18.0 2.88 17.12Q2.0 16.240000000000002 2.0 15.04V8.959999999999999Q2.0 7.759999999999998 2.88 6.879999999999999Q3.7600000000000002 6.0 5.04 6.0H17.04Q18.240000000000002 6.0 19.12 6.879999999999999Q20.0 7.759999999999998 20.0 8.959999999999999V14.959999999999999Q20.0 16.240000000000002 19.12 17.12Q18.240000000000002 18.0 17.04 18.0ZM11.040000000000001 8.0H5.04Q4.5600000000000005 8.0 4.28 8.280000000000001Q4.0 8.56 4.0 9.04V14.959999999999999Q4.0 15.44 4.28 15.719999999999999Q4.5600000000000005 16.0 4.96 16.0H11.040000000000001Q11.44 16.0 11.719999999999999 15.719999999999999Q12.0 15.44 12.0 15.04V8.959999999999999Q12.0 8.56 11.719999999999999 8.280000000000001Q11.44 8.0 10.96 8.0Z\"/>", "bell": "<path d=\"M22.56 13.68 20.64 6.800000000000001Q20.080000000000002 4.800000000000001 18.72 3.24Q17.36 1.6799999999999997 15.44 0.7999999999999989Q13.52 -0.08000000000000185 11.399999999999999 -1.7763568394002505e-15Q9.28 0.0799999999999983 7.4399999999999995 0.9999999999999982Q5.6000000000000005 1.9199999999999982 4.32 3.5599999999999987Q3.04 5.199999999999999 2.56 7.280000000000001L1.12 13.92Q0.88 15.04 1.12 16.16Q1.36 17.28 2.08 18.16Q2.8000000000000003 19.04 3.84 19.52Q4.88 20.0 6.0 20.0H7.12Q7.44 21.759999999999998 8.84 22.88Q10.24 24.0 12.0 24.0Q13.76 24.0 15.16 22.88Q16.56 21.759999999999998 16.88 20.0H17.76Q18.88 20.0 19.96 19.48Q21.04 18.96 21.72 18.04Q22.400000000000002 17.12 22.64 15.96Q22.88 14.799999999999999 22.56 13.68ZM12.0 22.0Q11.040000000000001 22.0 10.280000000000001 21.439999999999998Q9.52 20.88 9.200000000000001 20.0H14.8Q14.48 20.88 13.72 21.439999999999998Q12.96 22.0 12.0 22.0ZM20.16 16.8Q19.68 17.36 19.08 17.68Q18.48 18.0 17.76 18.0H6.0Q5.28 18.0 4.68 17.72Q4.08 17.439999999999998 3.64 16.88Q3.2 16.32 3.04 15.68Q2.88 15.04 3.04 14.32L4.5600000000000005 7.759999999999998Q5.04 5.280000000000001 7.0 3.6799999999999997Q8.96 2.0799999999999983 11.48 1.9999999999999982Q14.0 1.9199999999999982 16.04 3.4399999999999995Q18.080000000000002 4.960000000000001 18.72 7.359999999999999L20.64 14.16Q20.8 14.879999999999999 20.68 15.56Q20.56 16.240000000000002 20.16 16.8Z\"/>", "bluetooth": "<path d=\"M19.68 23.04H19.84Q20.0 23.04 20.04 22.96Q20.080000000000002 22.88 20.080000000000002 22.759999999999998Q20.080000000000002 22.64 19.84 22.64H19.68ZM20.080000000000002 23.52 19.84 23.12H19.68V23.52H19.6V22.56H20.0L20.16 22.64L20.240000000000002 22.8Q20.240000000000002 22.88 20.160000000000004 22.96Q20.080000000000002 23.04 20.0 23.12L20.240000000000002 23.52ZM19.84 22.24Q19.68 22.24 19.560000000000002 22.28Q19.44 22.32 19.32 22.439999999999998Q19.2 22.56 19.12 22.72Q19.04 23.04 19.12 23.36Q19.2 23.44 19.32 23.560000000000002Q19.44 23.68 19.6 23.759999999999998Q19.76 23.84 20.0 23.8Q20.240000000000002 23.76 20.4 23.6Q20.56 23.44 20.56 23.36Q20.72 23.04 20.56 22.72Q20.56 22.56 20.439999999999998 22.439999999999998Q20.32 22.32 20.16 22.28Q20.0 22.24 19.84 22.24ZM19.84 23.92Q19.68 23.92 19.52 23.840000000000003Q19.36 23.76 19.2 23.64Q19.04 23.52 18.96 23.36Q18.8 23.04 18.96 22.68Q19.12 22.32 19.52 22.16Q19.68 22.08 19.84 22.08Q20.0 22.08 20.200000000000003 22.159999999999997Q20.400000000000002 22.24 20.520000000000003 22.36Q20.64 22.48 20.72 22.64Q20.88 23.04 20.72 23.36Q20.64 23.52 20.48 23.68Q20.240000000000002 23.92 19.84 23.92ZM12.0 24.0Q14.8 24.0 16.64 23.04Q18.64 21.84 19.68 19.36Q20.88 16.56 20.88 12.0Q20.88 7.440000000000001 19.76 4.640000000000001Q18.72 2.16 16.64 0.9600000000000009Q14.8 0.0 12.0 0.0Q9.200000000000001 0.0 7.36 0.9600000000000009Q5.28 2.16 4.24 4.640000000000001Q3.12 7.440000000000001 3.12 12.0Q3.12 16.56 4.32 19.36Q5.36 21.84 7.36 23.04Q9.200000000000001 24.0 12.0 24.0ZM10.88 12.0 6.5600000000000005 7.68 7.84 6.48 11.200000000000001 9.84V1.6799999999999997L17.44 7.919999999999998L13.36 12.0L17.44 16.08L11.200000000000001 22.32V14.16L7.84 17.52L6.5600000000000005 16.32ZM12.96 18.08 14.96 16.08 12.96 14.08ZM12.96 5.919999999999998 14.96 7.919999999999998 12.96 9.92Z\"/>", "check": "<path d=\"M22.32 4.399999999999999 8.48 18.240000000000002Q8.24 18.56 7.800000000000001 18.56Q7.36 18.56 7.12 18.240000000000002L1.76 12.879999999999999Q1.44 12.64 1.04 12.64Q0.64 12.64 0.32 12.879999999999999Q0.0 13.2 0.0 13.6Q0.0 14.0 0.32 14.32L5.68 19.68Q6.5600000000000005 20.56 7.800000000000001 20.56Q9.040000000000001 20.56 9.92 19.68L23.76 5.84Q24.0 5.52 24.0 5.119999999999999Q24.0 4.719999999999999 23.76 4.399999999999999Q23.44 4.16 23.04 4.16Q22.64 4.16 22.32 4.399999999999999Z\"/>", "clock": "<path d=\"M12.0 0.0Q8.72 0.0 5.960000000000001 1.5999999999999996Q3.2 3.1999999999999993 1.6 5.959999999999999Q0.0 8.719999999999999 0.0 12.0Q0.0 15.28 1.6 18.04Q3.2 20.8 5.960000000000001 22.4Q8.72 24.0 12.0 24.0Q15.280000000000001 24.0 18.04 22.4Q20.8 20.8 22.4 18.04Q24.0 15.28 24.0 12.0Q24.0 8.719999999999999 22.4 5.959999999999999Q20.8 3.1999999999999993 18.04 1.5999999999999996Q15.280000000000001 0.0 12.0 0.0ZM12.0 22.0Q9.28 22.0 7.0 20.64Q4.72 19.28 3.36 17.0Q2.0 14.72 2.0 12.0Q2.0 9.28 3.36 6.999999999999999Q4.72 4.719999999999999 7.0 3.3599999999999994Q9.28 2.0 12.0 2.0Q14.72 2.0 17.0 3.3599999999999994Q19.28 4.719999999999999 20.64 6.999999999999999Q22.0 9.28 22.0 12.0Q22.0 14.72 20.64 17.0Q19.28 19.28 17.0 20.64Q14.72 22.0 12.0 22.0ZM12.0 6.0Q11.6 6.0 11.280000000000001 6.279999999999999Q10.96 6.559999999999999 10.96 6.960000000000001V11.36L7.6000000000000005 13.44Q7.28 13.68 7.2 14.08Q7.12 14.48 7.32 14.84Q7.5200000000000005 15.2 7.92 15.28Q8.32 15.36 8.72 15.12L12.56 12.72Q13.040000000000001 12.4 13.040000000000001 11.84V6.960000000000001Q13.040000000000001 6.559999999999999 12.72 6.279999999999999Q12.4 6.0 12.0 6.0Z\"/>", "close": "<path d=\"M23.68 0.3200000000000003Q23.44 0.0 23.0 0.0Q22.56 0.0 22.32 0.3200000000000003L12.0 10.56L1.68 0.3200000000000003Q1.44 0.0 1.0 0.0Q0.56 0.0 0.32 0.3200000000000003Q0.0 0.5599999999999987 0.0 1.0Q0.0 1.4400000000000013 0.32 1.6799999999999997L10.56 12.0L0.32 22.32Q0.0 22.56 0.0 23.0Q0.0 23.44 0.32 23.68Q0.56 24.0 1.0 24.0Q1.44 24.0 1.68 23.68L12.0 13.44L22.32 23.68Q22.56 24.0 23.0 24.0Q23.44 24.0 23.68 23.68Q24.0 23.44 24.0 23.0Q24.0 22.56 23.68 22.32L13.44 12.0L23.68 1.6799999999999997Q24.0 1.4400000000000013 24.0 1.0Q24.0 0.5599999999999987 23.68 0.3200000000000003Z\"/>", "download": "<path d=\"M9.84 18.16Q10.72 19.04 12.0 19.04Q13.280000000000001 19.04 14.16 18.16L17.36 14.879999999999999Q17.6 14.64 17.6 14.24Q17.6 13.84 17.32 13.559999999999999Q17.04 13.28 16.64 13.239999999999998Q16.240000000000002 13.2 15.92 13.52L12.96 16.4L13.040000000000001 0.9600000000000009Q13.040000000000001 0.5599999999999987 12.72 0.27999999999999936Q12.4 0.0 12.0 0.0Q11.6 0.0 11.280000000000001 0.27999999999999936Q10.96 0.5599999999999987 10.96 0.9600000000000009V16.4L8.08 13.52Q7.76 13.2 7.359999999999999 13.2Q6.96 13.2 6.68 13.48Q6.4 13.76 6.4 14.2Q6.4 14.64 6.640000000000001 14.879999999999999ZM23.04 16.0Q22.56 16.0 22.28 16.28Q22.0 16.56 22.0 17.04V20.96Q22.0 21.44 21.72 21.72Q21.44 22.0 21.04 22.0H3.04Q2.56 22.0 2.2800000000000002 21.72Q2.0 21.44 2.0 20.96V16.96Q2.0 16.56 1.72 16.28Q1.44 16.0 1.04 16.0Q0.56 16.0 0.28 16.28Q0.0 16.56 0.0 17.04V20.96Q0.0 22.24 0.88 23.119999999999997Q1.76 24.0 2.96 24.0H21.04Q22.240000000000002 24.0 23.12 23.119999999999997Q24.0 22.24 24.0 20.96V16.96Q24.0 16.56 23.72 16.28Q23.44 16.0 23.04 16.0Z\"/>", "edit": "<path d=\"M18.64 0.9600000000000009 6.48 13.12Q5.76 13.84 5.359999999999999 14.76Q4.96 15.68 5.04 16.64V18.0Q5.04 18.4 5.32 18.68Q5.6000000000000005 18.96 6.0 18.96H7.36Q8.32 19.04 9.24 18.64Q10.16 18.240000000000002 10.88 17.52L23.04 5.359999999999999Q24.0 4.399999999999999 24.0 3.119999999999999Q24.0 1.8399999999999999 23.08 0.9599999999999991Q22.16 0.0799999999999983 20.880000000000003 0.0799999999999983Q19.6 0.0799999999999983 18.64 0.9600000000000009ZM21.68 3.919999999999998 9.44 16.16Q8.56 16.96 7.36 16.96H7.04V16.64Q7.04 15.44 7.84 14.56L20.080000000000002 2.3200000000000003Q20.400000000000002 2.0 20.880000000000003 2.0Q21.36 2.0 21.68 2.3200000000000003Q22.0 2.6400000000000006 22.0 3.119999999999999Q22.0 3.599999999999998 21.68 3.919999999999998ZM23.04 8.959999999999999Q22.56 8.959999999999999 22.28 9.28Q22.0 9.6 22.0 10.0V14.959999999999999H18.0Q16.72 14.959999999999999 15.879999999999999 15.84Q15.040000000000001 16.72 15.040000000000001 18.0V22.0H5.04Q3.7600000000000002 22.0 2.88 21.119999999999997Q2.0 20.24 2.0 19.04V4.960000000000001Q2.0 3.759999999999998 2.88 2.879999999999999Q3.7600000000000002 2.0 4.96 2.0H14.08Q14.48 2.0 14.760000000000002 1.7200000000000006Q15.040000000000001 1.4400000000000013 15.040000000000001 1.0Q15.040000000000001 0.5599999999999987 14.760000000000002 0.27999999999999936Q14.48 0.0 14.08 0.0H5.04Q3.68 0.0 2.52 0.6799999999999997Q1.36 1.3599999999999994 0.68 2.5199999999999996Q0.0 3.6799999999999997 0.0 4.960000000000001V18.96Q0.0 20.32 0.68 21.48Q1.36 22.64 2.52 23.32Q3.68 24.0 4.96 24.0H16.32Q17.36 24.0 18.28 23.64Q19.2 23.28 19.84 22.56L22.56 19.84Q23.28 19.2 23.64 18.28Q24.0 17.36 24.0 16.32V10.0Q24.0 9.6 23.72 9.28Q23.44 8.959999999999999 23.04 8.959999999999999ZM18.48 21.12Q17.84 21.759999999999998 16.96 21.92V18.0Q17.04 17.6 17.32 17.32Q17.6 17.04 18.0 17.04H21.92Q21.76 17.84 21.12 18.48Z\"/>", "filter": "<path d=\"M1.04 4.719999999999999H3.7600000000000002Q4.08 6.0 5.08 6.76Q6.08 7.52 7.32 7.52Q8.56 7.52 9.600000000000001 6.76Q10.64 6.0 10.96 4.719999999999999H23.04Q23.44 4.719999999999999 23.72 4.4399999999999995Q24.0 4.16 24.0 3.76Q24.0 3.3599999999999994 23.72 3.039999999999999Q23.44 2.719999999999999 23.04 2.719999999999999H10.96Q10.64 1.5199999999999996 9.600000000000001 0.7599999999999998Q8.56 0.0 7.32 0.0Q6.08 0.0 5.08 0.7599999999999998Q4.08 1.5199999999999996 3.7600000000000002 2.719999999999999H1.04Q0.56 2.719999999999999 0.28 3.039999999999999Q0.0 3.3599999999999994 0.0 3.76Q0.0 4.16 0.28 4.4399999999999995Q0.56 4.719999999999999 0.96 4.719999999999999ZM7.36 2.0Q8.08 2.0 8.600000000000001 2.5199999999999996Q9.120000000000001 3.039999999999999 9.120000000000001 3.76Q9.120000000000001 4.48 8.600000000000001 5.0Q8.08 5.52 7.36 5.52Q6.640000000000001 5.52 6.120000000000001 5.0Q5.6000000000000005 4.48 5.6000000000000005 3.76Q5.6000000000000005 3.039999999999999 6.120000000000001 2.5199999999999996Q6.640000000000001 2.0 7.36 2.0ZM23.04 10.959999999999999H20.240000000000002Q19.92 9.76 18.92 9.0Q17.92 8.24 16.68 8.24Q15.44 8.24 14.44 9.0Q13.44 9.76 13.040000000000001 10.959999999999999H1.04Q0.56 11.04 0.28 11.32Q0.0 11.6 0.0 12.0Q0.0 12.4 0.28 12.719999999999999Q0.56 13.04 0.96 13.04H13.040000000000001Q13.44 14.24 14.44 15.0Q15.44 15.76 16.68 15.76Q17.92 15.76 18.92 15.0Q19.92 14.24 20.240000000000002 12.959999999999999H23.04Q23.44 13.04 23.72 12.719999999999999Q24.0 12.4 24.0 12.0Q24.0 11.6 23.72 11.28Q23.44 10.959999999999999 23.04 10.959999999999999ZM16.64 13.76Q15.92 13.76 15.4 13.24Q14.88 12.72 14.88 12.0Q14.88 11.28 15.4 10.76Q15.92 10.24 16.64 10.24Q17.36 10.24 17.880000000000003 10.76Q18.400000000000002 11.28 18.400000000000002 12.0Q18.400000000000002 12.72 17.880000000000003 13.24Q17.36 13.76 16.64 13.76ZM23.04 19.28H10.96Q10.64 18.0 9.600000000000001 17.240000000000002Q8.56 16.48 7.32 16.48Q6.08 16.48 5.08 17.240000000000002Q4.08 18.0 3.7600000000000002 19.28H1.04Q0.56 19.28 0.28 19.560000000000002Q0.0 19.84 0.0 20.240000000000002Q0.0 20.64 0.28 20.96Q0.56 21.28 0.96 21.28H3.7600000000000002Q4.08 22.48 5.08 23.240000000000002Q6.08 24.0 7.32 24.0Q8.56 24.0 9.600000000000001 23.240000000000002Q10.64 22.48 10.96 21.28H23.04Q23.44 21.28 23.72 20.96Q24.0 20.64 24.0 20.240000000000002Q24.0 19.84 23.72 19.560000000000002Q23.44 19.28 23.04 19.28ZM7.36 22.0Q6.640000000000001 22.0 6.120000000000001 21.48Q5.6000000000000005 20.96 5.6000000000000005 20.240000000000002Q5.6000000000000005 19.52 6.120000000000001 19.0Q6.640000000000001 18.48 7.36 18.48Q8.08 18.48 8.600000000000001 19.0Q9.120000000000001 19.52 9.120000000000001 20.240000000000002Q9.120000000000001 20.96 8.600000000000001 21.48Q8.08 22.0 7.36 22.0Z\"/>", "grid": "<path d=\"M7.04 0.0H4.0Q2.32 0.0 1.16 1.1600000000000001Q0.0 2.3200000000000003 0.0 4.0V6.960000000000001Q0.0 8.64 1.16 9.8Q2.32 10.959999999999999 4.0 10.959999999999999H7.04Q8.64 10.959999999999999 9.84 9.8Q11.040000000000001 8.64 10.96 7.039999999999999V4.0Q11.040000000000001 2.3200000000000003 9.84 1.1600000000000001Q8.64 0.0 7.04 0.0ZM9.040000000000001 6.960000000000001Q9.040000000000001 7.84 8.440000000000001 8.399999999999999Q7.84 8.959999999999999 6.96 8.959999999999999H4.0Q3.2 8.959999999999999 2.6 8.399999999999999Q2.0 7.84 2.0 6.960000000000001V4.0Q2.0 3.1999999999999993 2.6 2.5999999999999996Q3.2 2.0 4.0 2.0H7.04Q7.84 2.0 8.440000000000001 2.5999999999999996Q9.040000000000001 3.1999999999999993 9.040000000000001 4.0ZM20.0 0.0H17.04Q15.36 0.0 14.2 1.1600000000000001Q13.040000000000001 2.3200000000000003 13.040000000000001 4.0V6.960000000000001Q13.040000000000001 8.64 14.2 9.8Q15.36 10.959999999999999 17.04 10.959999999999999H20.0Q21.68 10.959999999999999 22.84 9.8Q24.0 8.64 24.0 7.039999999999999V4.0Q24.0 2.3200000000000003 22.84 1.1600000000000001Q21.68 0.0 20.0 0.0ZM22.0 6.960000000000001Q22.0 7.84 21.4 8.44Q20.8 9.04 20.0 8.959999999999999H17.04Q16.16 8.959999999999999 15.600000000000001 8.399999999999999Q15.040000000000001 7.84 15.040000000000001 6.960000000000001V4.0Q15.040000000000001 3.1999999999999993 15.600000000000001 2.5999999999999996Q16.16 2.0 17.04 2.0H20.0Q20.8 2.0 21.4 2.5999999999999996Q22.0 3.1999999999999993 22.0 4.0ZM7.04 12.959999999999999H4.0Q2.32 13.04 1.16 14.2Q0.0 15.36 0.0 16.96V20.0Q0.0 21.68 1.16 22.84Q2.32 24.0 4.0 24.0H7.04Q8.64 24.0 9.8 22.84Q10.96 21.68 10.96 20.0V16.96Q11.040000000000001 15.36 9.84 14.16Q8.64 12.959999999999999 7.04 13.04ZM9.040000000000001 20.0Q9.040000000000001 20.8 8.440000000000001 21.4Q7.84 22.0 6.96 22.0H4.0Q3.2 22.0 2.6 21.4Q2.0 20.8 2.0 20.0V16.96Q2.0 16.16 2.6 15.559999999999999Q3.2 14.959999999999999 4.0 14.959999999999999H7.04Q7.84 14.959999999999999 8.440000000000001 15.559999999999999Q9.040000000000001 16.16 9.040000000000001 16.96ZM20.0 12.959999999999999H17.04Q15.36 12.959999999999999 14.2 14.16Q13.040000000000001 15.36 13.040000000000001 16.96V20.0Q13.040000000000001 21.68 14.2 22.84Q15.36 24.0 17.04 24.0H20.0Q21.68 24.0 22.84 22.84Q24.0 21.68 24.0 20.0V16.96Q24.0 15.36 22.84 14.16Q21.68 12.959999999999999 20.0 13.04ZM22.0 20.0Q22.0 20.8 21.4 21.4Q20.8 22.0 20.0 22.0H17.04Q16.16 22.0 15.600000000000001 21.4Q15.040000000000001 20.8 15.040000000000001 20.0V16.96Q15.040000000000001 16.16 15.600000000000001 15.559999999999999Q16.16 14.959999999999999 17.04 14.959999999999999H20.0Q20.8 14.959999999999999 21.4 15.559999999999999Q22.0 16.16 22.0 16.96Z\"/>", "heart": "<path d=\"M17.52 1.9199999999999982Q15.76 1.9199999999999982 14.280000000000001 2.799999999999999Q12.8 3.6799999999999997 12.0 5.199999999999999Q11.200000000000001 3.6799999999999997 9.72 2.799999999999999Q8.24 1.9199999999999982 6.4399999999999995 1.959999999999999Q4.64 2.0 3.12 2.959999999999999Q1.6 3.919999999999998 0.76 5.52Q-0.08 7.120000000000001 0.0 8.959999999999999Q0.0 12.08 2.88 15.84Q5.12 18.72 8.8 21.84Q10.16 23.04 12.0 23.04Q13.84 23.04 15.200000000000001 21.84Q18.88 18.72 21.12 15.84Q24.0 12.08 24.0 8.959999999999999Q24.080000000000002 7.120000000000001 23.240000000000002 5.52Q22.400000000000002 3.919999999999998 20.880000000000003 2.959999999999999Q19.36 2.0 17.52 1.9199999999999982ZM13.92 20.32Q13.120000000000001 21.04 12.0 21.04Q10.88 21.04 10.08 20.32Q6.24 17.12 4.12 14.120000000000001Q2.0 11.12 2.0 8.959999999999999Q1.92 7.68 2.52 6.5600000000000005Q3.12 5.440000000000001 4.16 4.720000000000001Q5.2 4.0 6.48 4.0Q7.76 4.0 8.84 4.720000000000001Q9.92 5.440000000000001 10.48 6.5600000000000005Q11.040000000000001 7.68 11.040000000000001 8.959999999999999Q11.040000000000001 9.36 11.32 9.68Q11.6 10.0 12.0 10.0Q12.4 10.0 12.68 9.68Q12.96 9.36 13.040000000000001 8.959999999999999Q12.96 7.68 13.52 6.5600000000000005Q14.08 5.440000000000001 15.16 4.720000000000001Q16.240000000000002 4.0 17.520000000000003 4.0Q18.8 4.0 19.84 4.720000000000001Q20.88 5.440000000000001 21.48 6.5600000000000005Q22.080000000000002 7.68 22.0 8.959999999999999Q22.0 11.12 19.880000000000003 14.120000000000001Q17.76 17.12 13.92 20.32Z\"/>", "home": "<path d=\"M23.12 9.04 15.52 1.5199999999999996Q14.56 0.5599999999999987 13.280000000000001 0.1999999999999993Q12.0 -0.16000000000000014 10.719999999999999 0.1999999999999993Q9.44 0.5599999999999987 8.48 1.5199999999999996L0.88 9.04Q0.0 9.92 0.0 11.2V21.04Q0.0 22.24 0.88 23.119999999999997Q1.76 24.0 3.04 24.0H21.04Q22.240000000000002 24.0 23.12 23.119999999999997Q24.0 22.24 24.0 21.04V11.2Q24.0 9.92 23.12 9.04ZM15.040000000000001 22.0H9.040000000000001V18.08Q9.040000000000001 16.8 9.88 15.92Q10.72 15.04 12.0 15.04Q13.280000000000001 15.04 14.16 15.92Q15.040000000000001 16.8 15.040000000000001 18.08ZM22.0 21.04Q22.0 21.44 21.72 21.72Q21.44 22.0 21.04 22.0H17.04V18.08Q16.96 16.72 16.32 15.559999999999999Q15.68 14.4 14.52 13.719999999999999Q13.36 13.04 12.0 13.04Q10.64 13.04 9.48 13.719999999999999Q8.32 14.4 7.68 15.559999999999999Q7.04 16.72 7.04 18.08V22.0H3.04Q2.56 22.0 2.2800000000000002 21.72Q2.0 21.44 2.0 21.04V11.2Q2.0 10.799999999999999 2.32 10.48L9.84 2.879999999999999Q10.72 2.0 12.0 2.0Q13.280000000000001 2.0 14.16 2.879999999999999L21.68 10.48Q22.0 10.799999999999999 22.0 11.2Z\"/>", "info": "<path d=\"M12.0 0.0Q8.72 0.0 5.960000000000001 1.5999999999999996Q3.2 3.1999999999999993 1.6 5.959999999999999Q0.0 8.719999999999999 0.0 12.0Q0.0 15.28 1.6 18.04Q3.2 20.8 5.960000000000001 22.4Q8.72 24.0 12.0 24.0Q15.280000000000001 24.0 18.04 22.4Q20.8 20.8 22.4 18.04Q24.0 15.28 24.0 12.0Q24.0 8.719999999999999 22.4 5.959999999999999Q20.8 3.1999999999999993 18.04 1.5999999999999996Q15.280000000000001 0.0 12.0 0.0ZM12.0 22.0Q9.28 22.0 7.0 20.64Q4.72 19.28 3.36 17.0Q2.0 14.72 2.0 12.0Q2.0 9.28 3.36 6.999999999999999Q4.72 4.719999999999999 7.0 3.3599999999999994Q9.28 2.0 12.0 2.0Q14.72 2.0 17.0 3.3599999999999994Q19.28 4.719999999999999 20.64 6.999999999999999Q22.0 9.28 22.0 12.0Q22.0 14.72 20.64 17.0Q19.28 19.28 17.0 20.64Q14.72 22.0 12.0 22.0ZM12.0 10.0H11.040000000000001Q10.56 10.0 10.280000000000001 10.280000000000001Q10.0 10.56 10.0 11.0Q10.0 11.44 10.280000000000001 11.719999999999999Q10.56 12.0 11.040000000000001 12.0H12.0V18.0Q12.0 18.4 12.280000000000001 18.68Q12.56 18.96 13.0 18.96Q13.44 18.96 13.719999999999999 18.68Q14.0 18.4 14.0 18.0V12.0Q14.0 11.2 13.4 10.6Q12.8 10.0 12.0 10.0ZM10.48 6.48Q10.48 7.120000000000001 10.92 7.5600000000000005Q11.36 8.0 12.0 8.0Q12.64 8.0 13.08 7.5600000000000005Q13.52 7.120000000000001 13.52 6.48Q13.52 5.84 13.08 5.4Q12.64 4.960000000000001 12.0 5.0Q11.36 5.039999999999999 10.92 5.4399999999999995Q10.48 5.84 10.48 6.48Z\"/>", "map": "<path d=\"M20.72 1.1999999999999993 20.64 1.120000000000001 17.92 0.23999999999999844Q16.48 -0.240000000000002 15.040000000000001 0.16000000000000014L9.44 1.759999999999998Q8.4 2.0799999999999983 7.44 1.5999999999999979L6.96 1.3599999999999994Q5.76 0.879999999999999 4.52 1.0Q3.2800000000000002 1.120000000000001 2.24 1.8399999999999999Q1.2 2.5599999999999987 0.6 3.639999999999999Q0.0 4.719999999999999 0.0 6.0V18.08Q0.0 19.759999999999998 1.0 21.08Q2.0 22.4 3.6 22.88L6.48 23.76Q7.2 24.0 7.92 24.0Q8.64 24.0 9.28 23.84L15.120000000000001 22.24Q15.92 22.0 16.72 22.24L19.04 22.88Q19.92 23.12 20.840000000000003 22.92Q21.76 22.72 22.48 22.16Q23.2 21.6 23.6 20.76Q24.0 19.92 24.0 19.04V5.84Q24.0 4.32 23.08 3.0Q22.16 1.6799999999999997 20.72 1.1999999999999993ZM4.16 20.96Q3.2 20.72 2.6 19.88Q2.0 19.04 2.0 18.08V6.0Q2.0 5.280000000000001 2.3600000000000003 4.6Q2.72 3.919999999999998 3.4000000000000004 3.4399999999999995Q4.08 2.960000000000001 5.04 3.039999999999999Q5.6000000000000005 3.039999999999999 6.08 3.1999999999999993L6.96 3.599999999999998V21.84ZM9.040000000000001 21.84V3.84Q9.52 3.84 10.0 3.759999999999998L15.040000000000001 2.2399999999999984V20.16ZM22.0 19.04Q22.0 20.0 21.240000000000002 20.6Q20.48 21.2 19.6 20.96L17.04 20.24V2.0799999999999983L20.0 3.039999999999999Q20.88 3.3599999999999994 21.439999999999998 4.16Q22.0 4.960000000000001 22.0 5.84Z\"/>", "office": "<path d=\"M19.04 4.0H17.92Q17.52 2.2399999999999984 16.16 1.1199999999999992Q14.8 0.0 12.96 0.0H11.040000000000001Q9.200000000000001 0.0 7.840000000000001 1.1199999999999992Q6.48 2.2399999999999984 6.08 4.0H5.04Q3.68 4.0 2.52 4.68Q1.36 5.359999999999999 0.68 6.52Q0.0 7.68 0.0 8.959999999999999V18.96Q0.0 20.32 0.68 21.48Q1.36 22.64 2.52 23.32Q3.68 24.0 4.96 24.0H19.04Q20.32 24.0 21.48 23.32Q22.64 22.64 23.32 21.48Q24.0 20.32 24.0 19.04V8.959999999999999Q24.0 7.68 23.32 6.52Q22.64 5.359999999999999 21.48 4.68Q20.32 4.0 19.04 4.0ZM11.040000000000001 2.0H13.040000000000001Q13.92 2.0 14.719999999999999 2.5600000000000005Q15.52 3.120000000000001 15.84 4.0H8.16Q8.48 3.120000000000001 9.280000000000001 2.5600000000000005Q10.08 2.0 11.040000000000001 2.0ZM5.04 6.0H19.04Q20.240000000000002 6.0 21.12 6.879999999999999Q22.0 7.759999999999998 22.0 9.04V12.0H2.0V8.959999999999999Q2.0 7.759999999999998 2.88 6.879999999999999Q3.7600000000000002 6.0 4.96 6.0ZM19.04 22.0H5.04Q3.7600000000000002 22.0 2.88 21.119999999999997Q2.0 20.24 2.0 19.04V14.0H11.040000000000001V14.959999999999999Q11.040000000000001 15.44 11.32 15.719999999999999Q11.6 16.0 12.0 16.0Q12.4 16.0 12.72 15.719999999999999Q13.040000000000001 15.44 13.040000000000001 14.959999999999999V14.0H22.0V18.96Q22.0 20.24 21.12 21.119999999999997Q20.240000000000002 22.0 18.96 22.0Z\"/>", "pause": "<path d=\"M6.48 0.0Q5.04 0.0 4.0 1.0399999999999991Q2.96 2.0799999999999983 2.96 3.5199999999999996V20.48Q3.04 21.92 4.04 22.96Q5.04 24.0 6.48 24.0Q7.92 24.0 8.96 22.96Q10.0 21.92 10.0 20.48V3.5199999999999996Q10.0 2.0799999999999983 8.96 1.0399999999999991Q7.92 0.0 6.48 0.0ZM8.0 20.48Q8.0 21.12 7.5600000000000005 21.560000000000002Q7.12 22.0 6.48 22.0Q5.84 22.0 5.4399999999999995 21.560000000000002Q5.04 21.12 5.04 20.48V3.5199999999999996Q5.04 2.879999999999999 5.4399999999999995 2.4399999999999995Q5.84 2.0 6.48 2.0Q7.12 2.0 7.5600000000000005 2.4399999999999995Q8.0 2.879999999999999 8.0 3.5199999999999996ZM17.52 0.0Q16.080000000000002 0.0 15.040000000000001 1.0399999999999991Q14.0 2.0799999999999983 14.0 3.5199999999999996V20.48Q14.0 21.92 15.040000000000001 22.96Q16.080000000000002 24.0 17.520000000000003 24.0Q18.96 24.0 20.0 22.96Q21.04 21.92 21.04 20.48V3.5199999999999996Q21.04 2.0799999999999983 20.0 1.0399999999999991Q18.96 0.0 17.52 0.0ZM19.04 20.48Q18.96 21.12 18.560000000000002 21.560000000000002Q18.16 22.0 17.52 22.0Q16.88 22.0 16.439999999999998 21.560000000000002Q16.0 21.12 16.0 20.48V3.5199999999999996Q16.0 2.879999999999999 16.439999999999998 2.4399999999999995Q16.88 2.0 17.52 2.0Q18.16 2.0 18.6 2.4399999999999995Q19.04 2.879999999999999 19.04 3.5199999999999996Z\"/>", "pin": "<path d=\"M12.0 6.0Q10.32 6.0 9.16 7.16Q8.0 8.32 8.0 10.0Q8.0 11.68 9.16 12.84Q10.32 14.0 12.0 14.0Q13.68 14.0 14.84 12.84Q16.0 11.68 16.0 10.0Q16.0 8.32 14.84 7.16Q13.68 6.0 12.0 6.0ZM12.0 12.0Q11.200000000000001 12.0 10.600000000000001 11.399999999999999Q10.0 10.799999999999999 10.0 10.0Q10.0 9.2 10.600000000000001 8.6Q11.200000000000001 8.0 12.0 8.0Q12.8 8.0 13.4 8.6Q14.0 9.2 14.0 10.0Q14.0 10.799999999999999 13.4 11.399999999999999Q12.8 12.0 12.0 12.0ZM12.0 24.0Q10.72 24.0 9.56 23.439999999999998Q8.4 22.88 7.68 21.759999999999998Q1.92 13.84 1.92 10.08Q1.92 7.359999999999999 3.28 5.039999999999999Q4.64 2.719999999999999 6.959999999999999 1.3599999999999994Q9.28 0.0 12.0 0.0Q14.72 0.0 17.04 1.3599999999999994Q19.36 2.719999999999999 20.72 5.039999999999999Q22.080000000000002 7.359999999999999 22.080000000000002 10.08Q22.080000000000002 13.84 16.32 21.759999999999998Q15.6 22.88 14.440000000000001 23.439999999999998Q13.280000000000001 24.0 12.0 24.0ZM12.0 2.16Q9.84 2.16 8.04 3.24Q6.24 4.32 5.2 6.119999999999999Q4.16 7.919999999999998 4.16 10.08Q4.16 11.6 5.52 14.280000000000001Q6.88 16.96 9.44 20.56Q9.92 21.12 10.6 21.48Q11.28 21.84 12.0 21.84Q12.72 21.84 13.4 21.48Q14.08 21.12 14.56 20.56Q17.12 16.96 18.48 14.280000000000001Q19.84 11.6 19.84 10.08Q19.84 7.919999999999998 18.8 6.119999999999999Q17.76 4.32 15.96 3.24Q14.16 2.16 12.0 2.16Z\"/>", "play": "<path d=\"M20.48 8.0 10.96 0.9600000000000009Q9.84 0.16000000000000014 8.4 0.03999999999999915Q6.96 -0.08000000000000185 5.720000000000001 0.5599999999999987Q4.48 1.1999999999999993 3.7600000000000002 2.3999999999999986Q3.04 3.599999999999998 3.04 4.960000000000001V18.96Q3.04 20.4 3.7600000000000002 21.6Q4.48 22.8 5.76 23.439999999999998Q7.04 24.08 8.44 23.96Q9.84 23.84 10.96 23.04L20.48 16.0Q21.44 15.36 22.0 14.28Q22.56 13.2 22.56 12.0Q22.56 10.799999999999999 22.0 9.719999999999999Q21.44 8.64 20.48 8.0ZM19.28 14.4 9.76 21.44Q9.120000000000001 21.92 8.24 22.0Q7.36 22.08 6.640000000000001 21.68Q5.92 21.28 5.48 20.560000000000002Q5.04 19.84 5.04 19.04V4.960000000000001Q4.96 4.16 5.4399999999999995 3.4399999999999995Q5.92 2.719999999999999 6.6 2.3599999999999994Q7.28 2.0 8.0 2.0Q8.96 2.0 9.76 2.5599999999999987L19.28 9.6Q19.92 10.0 20.240000000000002 10.64Q20.56 11.28 20.56 12.0Q20.56 12.72 20.240000000000002 13.36Q19.92 14.0 19.28 14.4Z\"/>", "scooter": "<path d=\"M20.72 17.04 17.68 3.84Q17.28 2.16 15.920000000000002 1.08Q14.56 0.0 12.8 0.0H12.0Q11.6 0.0 11.32 0.27999999999999936Q11.040000000000001 0.5599999999999987 11.040000000000001 1.0Q11.040000000000001 1.4400000000000013 11.32 1.7200000000000006Q11.6 2.0 12.0 2.0H12.8Q13.84 2.0 14.68 2.6400000000000006Q15.52 3.280000000000001 15.76 4.32L17.52 12.08L14.4 15.92Q14.0 16.4 13.4 16.72Q12.8 17.04 12.08 17.04H1.04Q0.56 17.04 0.28 17.32Q0.0 17.6 0.0 18.0Q0.0 18.4 0.28 18.72Q0.56 19.04 1.04 19.04H1.36Q1.04 19.759999999999998 0.96 20.48Q1.04 21.92 2.04 22.96Q3.04 24.0 4.48 24.0Q5.92 24.0 6.96 22.96Q8.0 21.92 8.0 20.48Q8.0 19.759999999999998 7.68 19.04H12.08Q13.200000000000001 19.04 14.240000000000002 18.56Q15.280000000000001 18.08 16.0 17.2L18.080000000000002 14.56L18.8 17.439999999999998Q18.0 17.92 17.52 18.72Q17.04 19.52 17.04 20.48Q17.04 21.92 18.04 22.96Q19.04 24.0 20.48 24.0Q21.92 24.0 22.96 22.96Q24.0 21.92 24.0 20.520000000000003Q24.0 19.12 23.04 18.12Q22.080000000000002 17.12 20.72 17.04ZM6.0 20.48Q6.0 21.12 5.5600000000000005 21.560000000000002Q5.12 22.0 4.48 22.0Q3.84 22.0 3.44 21.560000000000002Q3.04 21.12 3.04 20.48Q3.04 19.84 3.44 19.4Q3.84 18.96 4.48 18.96Q5.12 18.96 5.5600000000000005 19.4Q6.0 19.84 6.0 20.48ZM20.48 22.0Q19.84 22.0 19.439999999999998 21.560000000000002Q19.04 21.12 19.04 20.48Q19.04 19.84 19.439999999999998 19.4Q19.84 18.96 20.48 19.0Q21.12 19.04 21.560000000000002 19.439999999999998Q22.0 19.84 22.0 20.48Q22.0 21.12 21.560000000000002 21.560000000000002Q21.12 22.0 20.48 22.0Z\"/>", "search": "<path d=\"M23.68 22.32 17.76 16.32Q19.44 14.32 19.880000000000003 11.76Q20.32 9.2 19.48 6.76Q18.64 4.32 16.68 2.5600000000000005Q14.72 0.8000000000000007 12.24 0.2400000000000002Q9.76 -0.3200000000000003 7.24 0.35999999999999943Q4.72 1.0399999999999991 2.88 2.879999999999999Q1.04 4.719999999999999 0.36 7.239999999999999Q-0.32 9.76 0.24000000000000002 12.24Q0.8 14.72 2.56 16.68Q4.32 18.64 6.760000000000001 19.48Q9.200000000000001 20.32 11.760000000000002 19.88Q14.32 19.439999999999998 16.32 17.759999999999998L22.32 23.68Q22.56 24.0 23.0 24.0Q23.44 24.0 23.72 23.72Q24.0 23.44 24.0 23.0Q24.0 22.56 23.68 22.32ZM10.0 18.0Q7.84 18.0 6.0 16.92Q4.16 15.84 3.08 14.0Q2.0 12.16 2.0 10.0Q2.0 7.84 3.08 6.0Q4.16 4.16 6.0 3.08Q7.84 2.0 10.0 2.0Q12.16 2.0 14.0 3.08Q15.84 4.16 16.92 6.0Q18.0 7.84 18.0 10.0Q18.0 12.16 16.92 14.0Q15.84 15.84 14.0 16.92Q12.16 18.0 10.0 18.0Z\"/>", "settings": "<path d=\"M12.0 8.0Q10.32 8.0 9.16 9.16Q8.0 10.32 8.0 12.0Q8.0 13.68 9.16 14.84Q10.32 16.0 12.0 16.0Q13.68 16.0 14.84 14.84Q16.0 13.68 16.0 12.0Q16.0 10.32 14.84 9.16Q13.68 8.0 12.0 8.0ZM12.0 14.0Q11.200000000000001 14.0 10.600000000000001 13.399999999999999Q10.0 12.799999999999999 10.0 12.0Q10.0 11.2 10.600000000000001 10.6Q11.200000000000001 10.0 12.0 10.0Q12.8 10.0 13.4 10.6Q14.0 11.2 14.0 12.0Q14.0 12.799999999999999 13.4 13.399999999999999Q12.8 14.0 12.0 14.0ZM21.28 13.92 20.88 13.68Q21.12 12.0 20.88 10.32L21.28 10.08Q22.0 9.68 22.4 9.0Q22.8 8.32 22.8 7.52Q22.8 6.719999999999999 22.4 6.0Q22.0 5.280000000000001 21.28 4.880000000000001Q20.56 4.48 19.759999999999998 4.48Q18.96 4.48 18.32 4.879999999999999L17.84 5.120000000000001Q16.56 4.079999999999998 15.040000000000001 3.5199999999999996V2.960000000000001Q15.040000000000001 1.759999999999998 14.16 0.879999999999999Q13.280000000000001 0.0 12.0 0.0Q10.72 0.0 9.84 0.879999999999999Q8.96 1.759999999999998 9.040000000000001 3.039999999999999V3.5199999999999996Q7.44 4.079999999999998 6.16 5.120000000000001L5.68 4.879999999999999Q4.64 4.239999999999998 3.44 4.6Q2.24 4.960000000000001 1.6 6.0Q0.96 7.039999999999999 1.28 8.239999999999998Q1.6 9.44 2.72 10.08L3.12 10.32Q2.88 12.0 3.12 13.68L2.72 13.92Q1.6 14.56 1.28 15.760000000000002Q0.96 16.96 1.6 18.0Q2.24 19.04 3.44 19.4Q4.64 19.759999999999998 5.68 19.12L6.16 18.88Q7.44 19.92 8.96 20.48V20.96Q9.040000000000001 22.24 9.88 23.119999999999997Q10.72 24.0 12.0 24.0Q13.280000000000001 24.0 14.120000000000001 23.119999999999997Q14.96 22.24 15.040000000000001 21.04V20.48Q16.56 19.92 17.84 18.88L18.32 19.12Q19.36 19.759999999999998 20.560000000000002 19.4Q21.76 19.04 22.4 18.0Q23.04 16.96 22.72 15.760000000000002Q22.400000000000002 14.56 21.28 13.92ZM18.72 10.16Q19.28 12.0 18.72 13.84Q18.64 14.24 18.759999999999998 14.52Q18.88 14.799999999999999 19.2 15.04L20.32 15.6Q20.64 15.84 20.759999999999998 16.240000000000002Q20.88 16.64 20.68 17.0Q20.48 17.36 20.08 17.48Q19.68 17.6 19.28 17.36L18.240000000000002 16.72Q17.92 16.56 17.560000000000002 16.6Q17.2 16.64 16.96 16.88Q15.6 18.32 13.76 18.8Q13.44 18.88 13.2 19.159999999999997Q12.96 19.439999999999998 12.96 19.759999999999998V20.96Q12.96 21.44 12.68 21.72Q12.4 22.0 12.0 22.0Q11.6 22.0 11.280000000000001 21.72Q10.96 21.44 10.96 20.96V19.759999999999998Q10.96 19.439999999999998 10.760000000000002 19.159999999999997Q10.56 18.88 10.24 18.8Q8.4 18.32 7.04 16.88Q6.8 16.64 6.4399999999999995 16.6Q6.08 16.56 5.76 16.72L4.72 17.36Q4.24 17.68 3.72 17.36Q3.2 17.04 3.2 16.48Q3.2 15.92 3.68 15.6L4.8 15.04Q5.12 14.799999999999999 5.24 14.52Q5.36 14.24 5.28 13.84Q4.72 12.0 5.28 10.16Q5.36 9.76 5.24 9.48Q5.12 9.2 4.8 8.959999999999999L3.68 8.4Q3.2 8.08 3.2 7.5200000000000005Q3.2 6.960000000000001 3.72 6.640000000000001Q4.24 6.32 4.72 6.640000000000001L5.76 7.280000000000001Q6.08 7.440000000000001 6.4399999999999995 7.4Q6.8 7.359999999999999 7.04 7.120000000000001Q8.4 5.68 10.24 5.199999999999999Q10.56 5.120000000000001 10.8 4.84Q11.040000000000001 4.559999999999999 11.040000000000001 4.239999999999998V2.960000000000001Q10.96 2.5599999999999987 11.280000000000001 2.2799999999999994Q11.6 2.0 12.0 2.0Q12.4 2.0 12.72 2.2799999999999994Q13.040000000000001 2.5599999999999987 13.040000000000001 2.960000000000001V4.239999999999998Q12.96 4.559999999999999 13.2 4.84Q13.44 5.120000000000001 13.76 5.199999999999999Q15.6 5.68 16.96 7.120000000000001Q17.2 7.359999999999999 17.560000000000002 7.4Q17.92 7.440000000000001 18.240000000000002 7.280000000000001L19.28 6.640000000000001Q19.76 6.32 20.28 6.640000000000001Q20.8 6.960000000000001 20.8 7.5200000000000005Q20.8 8.08 20.32 8.4L19.2 8.959999999999999Q18.88 9.2 18.759999999999998 9.48Q18.64 9.76 18.72 10.16Z\"/>", "sun": "<path d=\"M23.04 10.959999999999999H18.96Q18.8 10.16 18.48 9.36L22.0 7.359999999999999Q22.56 7.039999999999999 22.56 6.479999999999999Q22.56 5.919999999999998 22.04 5.6Q21.52 5.280000000000001 21.04 5.599999999999998L17.52 7.68Q16.96 7.039999999999999 16.32 6.48L18.400000000000002 2.960000000000001Q18.56 2.6400000000000006 18.439999999999998 2.24Q18.32 1.8399999999999999 18.0 1.6400000000000006Q17.68 1.4400000000000013 17.28 1.5199999999999996Q16.88 1.5999999999999979 16.64 2.0L14.64 5.52Q13.84 5.199999999999999 12.96 5.039999999999999V0.9600000000000009Q12.96 0.5599999999999987 12.68 0.27999999999999936Q12.4 0.0 12.0 0.0Q11.6 0.0 11.280000000000001 0.27999999999999936Q10.96 0.5599999999999987 10.96 0.9600000000000009V5.039999999999999Q10.16 5.199999999999999 9.36 5.52L7.36 2.0Q7.12 1.5999999999999979 6.720000000000001 1.5199999999999996Q6.32 1.4400000000000013 6.0 1.6400000000000006Q5.68 1.8399999999999999 5.5600000000000005 2.24Q5.44 2.6400000000000006 5.6000000000000005 2.960000000000001L7.68 6.48Q7.04 7.039999999999999 6.48 7.68L2.96 5.599999999999998Q2.48 5.280000000000001 1.96 5.6Q1.44 5.919999999999998 1.44 6.479999999999999Q1.44 7.039999999999999 2.0 7.359999999999999L5.5200000000000005 9.36Q5.2 10.16 5.04 10.959999999999999H1.04Q0.56 10.959999999999999 0.28 11.28Q0.0 11.6 0.0 12.0Q0.0 12.4 0.28 12.719999999999999Q0.56 13.04 0.96 13.04H5.12Q5.2 13.84 5.5200000000000005 14.64L2.0 16.64Q1.44 16.96 1.44 17.52Q1.44 18.08 1.96 18.4Q2.48 18.72 2.96 18.4L6.48 16.32Q7.04 16.96 7.68 17.52L5.6000000000000005 21.04Q5.44 21.36 5.5600000000000005 21.759999999999998Q5.68 22.16 6.0 22.36Q6.32 22.56 6.720000000000001 22.479999999999997Q7.12 22.4 7.36 22.0L9.36 18.48Q10.16 18.8 11.040000000000001 18.96V22.96Q11.040000000000001 23.44 11.32 23.72Q11.6 24.0 12.0 24.0Q12.4 24.0 12.72 23.72Q13.040000000000001 23.44 13.040000000000001 23.04V18.88Q13.84 18.8 14.64 18.48L16.64 22.0Q16.88 22.4 17.28 22.479999999999997Q17.68 22.56 18.0 22.36Q18.32 22.16 18.439999999999998 21.759999999999998Q18.56 21.36 18.400000000000002 21.04L16.32 17.52Q16.96 16.96 17.52 16.32L21.04 18.4Q21.52 18.72 22.04 18.4Q22.56 18.08 22.56 17.52Q22.56 16.96 22.0 16.64L18.48 14.64Q18.8 13.84 18.96 12.959999999999999H23.04Q23.44 12.959999999999999 23.72 12.68Q24.0 12.4 24.0 12.0Q24.0 11.6 23.72 11.28Q23.44 10.959999999999999 23.04 10.959999999999999ZM12.0 16.96Q9.68 16.96 8.32 15.36Q7.04 14.0 7.04 12.0Q7.04 10.0 8.32 8.64Q9.68 7.039999999999999 12.0 7.039999999999999Q14.32 7.039999999999999 15.68 8.64Q16.96 10.0 16.96 12.0Q16.96 14.0 15.68 15.36Q14.32 16.96 12.0 16.96Z\"/>", "target": "<path d=\"M12.0 0.0Q8.72 0.0 5.960000000000001 1.5999999999999996Q3.2 3.1999999999999993 1.6 5.959999999999999Q0.0 8.719999999999999 0.0 12.0Q0.0 15.28 1.6 18.04Q3.2 20.8 5.960000000000001 22.4Q8.72 24.0 12.0 24.0Q15.280000000000001 24.0 18.04 22.4Q20.8 20.8 22.4 18.04Q24.0 15.28 24.0 12.0Q24.0 8.719999999999999 22.4 5.959999999999999Q20.8 3.1999999999999993 18.04 1.5999999999999996Q15.280000000000001 0.0 12.0 0.0ZM13.040000000000001 21.92V20.0Q13.040000000000001 19.6 12.72 19.32Q12.4 19.04 12.0 19.0Q11.6 18.96 11.280000000000001 19.28Q10.96 19.6 10.96 20.0V21.92Q8.64 21.68 6.68 20.48Q4.72 19.28 3.5199999999999996 17.32Q2.32 15.36 2.08 13.04H4.0Q4.4 13.04 4.720000000000001 12.719999999999999Q5.04 12.4 5.04 12.0Q5.04 11.6 4.720000000000001 11.28Q4.4 10.959999999999999 4.0 10.959999999999999H2.08Q2.32 8.64 3.5199999999999996 6.68Q4.72 4.719999999999999 6.68 3.5199999999999996Q8.64 2.3200000000000003 10.96 2.0799999999999983V4.0Q10.96 4.399999999999999 11.280000000000001 4.719999999999999Q11.6 5.039999999999999 12.0 5.0Q12.4 4.960000000000001 12.72 4.68Q13.040000000000001 4.399999999999999 13.040000000000001 4.0V2.0799999999999983Q15.36 2.3200000000000003 17.32 3.5199999999999996Q19.28 4.719999999999999 20.48 6.68Q21.68 8.64 21.92 10.959999999999999H20.0Q19.6 10.959999999999999 19.28 11.28Q18.96 11.6 18.96 12.0Q18.96 12.4 19.28 12.719999999999999Q19.6 13.04 20.0 13.04H21.92Q21.68 15.36 20.48 17.32Q19.28 19.28 17.32 20.48Q15.36 21.68 12.96 21.92ZM16.0 12.0Q16.0 12.4 15.719999999999999 12.719999999999999Q15.44 13.04 15.040000000000001 13.04H13.040000000000001V14.959999999999999Q13.040000000000001 15.44 12.72 15.719999999999999Q12.4 16.0 12.0 16.0Q11.6 16.0 11.280000000000001 15.719999999999999Q10.96 15.44 10.96 14.959999999999999V12.959999999999999H9.040000000000001Q8.56 12.959999999999999 8.280000000000001 12.68Q8.0 12.4 8.0 12.0Q8.0 11.6 8.280000000000001 11.28Q8.56 10.959999999999999 9.040000000000001 10.959999999999999H11.040000000000001V8.959999999999999Q11.040000000000001 8.56 11.32 8.280000000000001Q11.6 8.0 12.0 8.0Q12.4 8.0 12.72 8.280000000000001Q13.040000000000001 8.56 13.040000000000001 8.959999999999999V10.959999999999999H15.040000000000001Q15.44 10.959999999999999 15.719999999999999 11.28Q16.0 11.6 16.0 12.0Z\"/>", "trash": "<path d=\"M21.04 4.0H17.92Q17.52 2.2399999999999984 16.16 1.1199999999999992Q14.8 0.0 12.96 0.0H11.040000000000001Q9.200000000000001 0.0 7.840000000000001 1.1199999999999992Q6.48 2.2399999999999984 6.08 4.0H3.04Q2.56 4.0 2.2800000000000002 4.279999999999999Q2.0 4.559999999999999 2.0 5.0Q2.0 5.440000000000001 2.2800000000000002 5.720000000000001Q2.56 6.0 3.04 6.0H4.0V18.96Q4.0 20.32 4.68 21.48Q5.36 22.64 6.52 23.32Q7.68 24.0 8.96 24.0H15.040000000000001Q16.32 24.0 17.48 23.32Q18.64 22.64 19.32 21.48Q20.0 20.32 20.0 19.04V6.0H21.04Q21.44 6.0 21.72 5.720000000000001Q22.0 5.440000000000001 22.0 5.0Q22.0 4.559999999999999 21.72 4.279999999999999Q21.44 4.0 21.04 4.0ZM11.040000000000001 2.0H13.040000000000001Q13.92 2.0 14.719999999999999 2.5600000000000005Q15.52 3.120000000000001 15.84 4.0H8.16Q8.48 3.120000000000001 9.280000000000001 2.5600000000000005Q10.08 2.0 11.040000000000001 2.0ZM18.0 18.96Q18.0 20.24 17.12 21.119999999999997Q16.240000000000002 22.0 14.96 22.0H9.040000000000001Q7.76 22.0 6.88 21.119999999999997Q6.0 20.24 6.0 19.04V6.0H18.0ZM10.0 18.0Q10.4 18.0 10.72 17.72Q11.040000000000001 17.439999999999998 11.040000000000001 16.96V10.959999999999999Q11.040000000000001 10.56 10.72 10.280000000000001Q10.4 10.0 10.0 10.0Q9.6 10.0 9.32 10.280000000000001Q9.040000000000001 10.56 9.040000000000001 10.959999999999999V16.96Q8.96 17.439999999999998 9.280000000000001 17.72Q9.6 18.0 10.0 18.0ZM14.0 18.0Q14.4 18.0 14.72 17.72Q15.040000000000001 17.439999999999998 15.040000000000001 16.96V10.959999999999999Q15.040000000000001 10.56 14.72 10.280000000000001Q14.4 10.0 14.0 10.0Q13.6 10.0 13.280000000000001 10.280000000000001Q12.96 10.56 12.96 10.959999999999999V16.96Q13.040000000000001 17.439999999999998 13.32 17.72Q13.6 18.0 14.0 18.0Z\"/>", "user": "<path d=\"M12.0 12.0Q13.6 12.0 15.0 11.2Q16.4 10.4 17.2 9.0Q18.0 7.600000000000001 18.0 6.0Q18.0 4.399999999999999 17.2 2.9999999999999982Q16.4 1.5999999999999979 15.0 0.7999999999999989Q13.6 0.0 12.0 0.0Q10.4 0.0 9.0 0.7999999999999989Q7.6000000000000005 1.5999999999999979 6.800000000000001 2.9999999999999982Q6.0 4.399999999999999 6.0 6.0Q6.0 7.600000000000001 6.800000000000001 9.0Q7.6000000000000005 10.4 9.0 11.2Q10.4 12.0 12.0 12.0ZM12.0 2.0Q13.68 2.0 14.84 3.16Q16.0 4.32 16.0 6.0Q16.0 7.68 14.84 8.84Q13.68 10.0 12.0 10.0Q10.32 10.0 9.16 8.84Q8.0 7.68 8.0 6.0Q8.0 4.32 9.16 3.16Q10.32 2.0 12.0 2.0ZM12.0 14.0Q9.52 14.0 7.48 15.2Q5.44 16.4 4.24 18.479999999999997Q3.04 20.56 2.96 23.04Q3.04 23.44 3.3200000000000003 23.72Q3.6 24.0 4.0 24.0Q4.4 24.0 4.68 23.72Q4.96 23.44 4.96 23.04Q5.04 21.12 5.96 19.520000000000003Q6.88 17.92 8.48 16.96Q10.08 16.0 12.0 16.0Q13.92 16.0 15.52 16.96Q17.12 17.92 18.08 19.520000000000003Q19.04 21.12 19.04 23.04Q19.04 23.44 19.32 23.72Q19.6 24.0 20.0 24.0Q20.400000000000002 24.0 20.72 23.72Q21.04 23.44 21.04 23.04Q20.96 20.56 19.759999999999998 18.479999999999997Q18.56 16.4 16.52 15.2Q14.48 14.0 12.0 14.0Z\"/>", "warning": "<path d=\"M11.040000000000001 12.959999999999999V6.960000000000001Q11.040000000000001 6.559999999999999 11.32 6.279999999999999Q11.6 6.0 12.0 6.0Q12.4 6.0 12.72 6.279999999999999Q13.040000000000001 6.559999999999999 13.040000000000001 6.960000000000001V12.959999999999999Q13.040000000000001 13.44 12.72 13.719999999999999Q12.4 14.0 12.0 14.0Q11.6 14.0 11.32 13.719999999999999Q11.040000000000001 13.44 11.040000000000001 12.959999999999999ZM12.0 14.959999999999999Q11.36 14.959999999999999 10.92 15.399999999999999Q10.48 15.84 10.48 16.48Q10.48 17.12 10.92 17.560000000000002Q11.36 18.0 12.0 18.0Q12.64 18.0 13.08 17.560000000000002Q13.52 17.12 13.52 16.48Q13.52 15.84 13.08 15.399999999999999Q12.64 14.959999999999999 12.0 14.959999999999999ZM23.6 19.84Q23.04 20.88 22.0 21.439999999999998Q20.96 22.0 19.6 22.0H4.48Q3.04 22.0 2.0 21.439999999999998Q0.96 20.88 0.44 19.88Q-0.08 18.88 0.04 17.64Q0.16 16.4 0.96 15.28L8.96 2.5599999999999987Q9.52 1.8399999999999999 10.32 1.4000000000000004Q11.120000000000001 0.9600000000000009 12.0 0.9600000000000009Q12.88 0.9600000000000009 13.68 1.4000000000000004Q14.48 1.8399999999999999 15.040000000000001 2.5599999999999987L23.12 15.36Q23.84 16.4 23.96 17.64Q24.080000000000002 18.88 23.6 19.84ZM21.44 16.48Q21.44 16.4 21.44 16.4L13.36 3.6799999999999997Q12.88 2.960000000000001 12.0 2.960000000000001Q11.120000000000001 2.960000000000001 10.64 3.6799999999999997L2.56 16.4Q2.16 17.04 2.04 17.72Q1.92 18.4 2.16 18.96Q2.72 20.0 4.4 20.0H19.52Q21.28 20.0 21.76 18.96Q22.080000000000002 18.4 21.96 17.759999999999998Q21.84 17.12 21.44 16.48Z\"/>", "wifi": "<path d=\"M10.0 18.96Q10.0 18.16 10.600000000000001 17.560000000000002Q11.200000000000001 16.96 12.0 16.96Q12.8 16.96 13.4 17.560000000000002Q14.0 18.16 14.0 19.0Q14.0 19.84 13.4 20.4Q12.8 20.96 12.0 20.96Q11.200000000000001 20.96 10.600000000000001 20.4Q10.0 19.84 10.0 18.96ZM23.68 9.52Q24.0 9.28 24.0 8.84Q24.0 8.4 23.76 8.16Q21.44 5.68 18.4 4.359999999999999Q15.36 3.039999999999999 12.0 3.039999999999999Q8.64 3.039999999999999 5.6000000000000005 4.359999999999999Q2.56 5.68 0.24 8.08Q0.0 8.4 0.0 8.84Q0.0 9.28 0.32 9.559999999999999Q0.64 9.84 1.04 9.8Q1.44 9.76 1.76 9.44Q3.68 7.359999999999999 6.4 6.16Q9.120000000000001 4.960000000000001 12.0 4.960000000000001Q14.88 4.960000000000001 17.6 6.16Q20.32 7.359999999999999 22.240000000000002 9.44Q22.56 9.76 22.96 9.76Q23.36 9.76 23.68 9.52ZM18.64 14.32Q18.96 14.08 19.0 13.68Q19.04 13.28 18.72 12.959999999999999Q17.44 11.52 15.68 10.76Q13.92 10.0 12.0 10.0Q10.08 10.0 8.32 10.76Q6.5600000000000005 11.52 5.28 12.959999999999999Q4.96 13.2 5.0 13.64Q5.04 14.08 5.32 14.36Q5.6000000000000005 14.64 6.040000000000001 14.64Q6.48 14.64 6.72 14.32Q7.76 13.2 9.120000000000001 12.6Q10.48 12.0 12.0 12.0Q13.52 12.0 14.88 12.6Q16.240000000000002 13.2 17.28 14.32Q17.6 14.64 18.0 14.64Q18.400000000000002 14.64 18.64 14.32Z\"/>", "chat": "<path d=\"M24.0 11.28Q23.84 8.0 22.08 5.4Q20.32 2.8000000000000007 17.52 1.3200000000000003Q14.72 -0.16000000000000014 11.52 -0.040000000000000924Q8.32 0.0799999999999983 5.640000000000001 1.799999999999999Q2.96 3.5199999999999996 1.44 6.279999999999999Q-0.08 9.04 0.0 12.239999999999998Q0.08 15.44 1.72 18.16Q3.36 20.88 6.08 22.439999999999998Q8.8 24.0 12.0 24.0H19.04Q20.32 24.0 21.48 23.32Q22.64 22.64 23.32 21.48Q24.0 20.32 24.0 19.04ZM22.0 18.96Q22.0 20.24 21.12 21.119999999999997Q20.240000000000002 22.0 18.96 22.0H12.0Q9.84 22.0 7.92 21.119999999999997Q6.0 20.24 4.5600000000000005 18.64Q3.12 17.04 2.48 15.0Q1.84 12.959999999999999 2.08 10.76Q2.32 8.56 3.5199999999999996 6.680000000000001Q4.72 4.800000000000001 6.6 3.5999999999999996Q8.48 2.3999999999999986 10.72 2.0799999999999983Q11.36 2.0 12.0 2.0Q13.76 2.0 15.399999999999999 2.5999999999999996Q17.04 3.1999999999999993 18.400000000000002 4.32Q20.0 5.599999999999998 20.92 7.439999999999999Q21.84 9.28 22.0 11.36ZM8.0 8.959999999999999H12.0Q12.4 8.959999999999999 12.72 8.68Q13.040000000000001 8.4 13.040000000000001 8.0Q13.040000000000001 7.600000000000001 12.72 7.280000000000001Q12.4 6.960000000000001 12.0 6.960000000000001H8.0Q7.6000000000000005 6.960000000000001 7.32 7.280000000000001Q7.04 7.600000000000001 7.04 8.0Q7.04 8.4 7.32 8.719999999999999Q7.6000000000000005 9.04 8.0 9.04ZM16.0 10.959999999999999H8.0Q7.6000000000000005 10.959999999999999 7.32 11.28Q7.04 11.6 7.04 12.0Q7.04 12.4 7.32 12.719999999999999Q7.6000000000000005 13.04 8.0 13.04H16.0Q16.4 12.959999999999999 16.72 12.68Q17.04 12.4 17.04 12.0Q17.04 11.6 16.72 11.28Q16.4 10.959999999999999 16.0 10.959999999999999ZM16.0 14.959999999999999H8.0Q7.6000000000000005 15.04 7.32 15.32Q7.04 15.6 7.04 16.0Q7.04 16.4 7.32 16.68Q7.6000000000000005 16.96 8.0 16.96H16.0Q16.4 16.96 16.72 16.68Q17.04 16.4 17.04 16.0Q17.04 15.6 16.72 15.32Q16.4 15.04 16.0 15.04Z\"/>", "shield": "<path d=\"M18.56 2.16 12.32 0.0799999999999983Q12.0 -0.08000000000000185 11.68 0.0799999999999983L5.44 2.16Q3.92 2.6400000000000006 2.96 3.960000000000001Q2.0 5.280000000000001 2.0 6.879999999999999V12.0Q2.0 15.36 4.4 18.4Q6.16 20.64 8.96 22.4Q10.4 23.36 11.6 23.92Q12.0 24.08 12.4 23.92Q13.6 23.36 15.040000000000001 22.4Q17.84 20.64 19.6 18.4Q22.0 15.36 22.0 12.0V6.879999999999999Q22.0 5.280000000000001 21.04 3.960000000000001Q20.080000000000002 2.6400000000000006 18.56 2.16ZM20.0 12.0Q20.0 14.48 18.32 16.8Q17.04 18.56 14.8 20.16Q13.44 21.12 12.0 21.92Q10.56 21.12 9.200000000000001 20.16Q6.96 18.56 5.68 16.8Q4.0 14.48 4.0 12.0V6.879999999999999Q4.0 5.919999999999998 4.5600000000000005 5.119999999999999Q5.12 4.32 6.08 4.0L12.0 2.0799999999999983L17.92 4.0Q18.88 4.32 19.439999999999998 5.119999999999999Q20.0 5.919999999999998 20.0 6.879999999999999ZM15.280000000000001 8.32 11.120000000000001 12.48 8.88 10.16Q8.48 9.76 7.92 9.879999999999999Q7.36 10.0 7.2 10.559999999999999Q7.04 11.12 7.44 11.52L9.76 13.92Q10.24 14.56 11.040000000000001 14.56H11.120000000000001Q11.92 14.56 12.48 14.0L16.72 9.76Q17.04 9.44 17.04 9.0Q17.04 8.56 16.72 8.280000000000001Q16.4 8.0 16.0 8.0Q15.6 8.0 15.280000000000001 8.32Z\"/>", "photo": "<path d=\"M19.04 0.0H5.04Q3.68 0.0 2.52 0.6799999999999997Q1.36 1.3599999999999994 0.68 2.5199999999999996Q0.0 3.6799999999999997 0.0 4.960000000000001V18.96Q0.0 20.32 0.68 21.48Q1.36 22.64 2.52 23.32Q3.68 24.0 4.96 24.0H19.04Q20.32 24.0 21.48 23.32Q22.64 22.64 23.32 21.48Q24.0 20.32 24.0 19.04V4.960000000000001Q24.0 3.6799999999999997 23.32 2.5199999999999996Q22.64 1.3599999999999994 21.48 0.6799999999999997Q20.32 0.0 19.04 0.0ZM5.04 2.0H19.04Q20.240000000000002 2.0 21.12 2.879999999999999Q22.0 3.759999999999998 22.0 5.039999999999999V18.96Q22.0 19.68 21.68 20.32L12.56 11.12Q11.84 10.4 10.92 10.04Q10.0 9.68 9.0 9.68Q8.0 9.68 7.08 10.04Q6.16 10.4 5.44 11.12L2.0 14.56V4.960000000000001Q2.0 3.759999999999998 2.88 2.879999999999999Q3.7600000000000002 2.0 4.96 2.0ZM5.04 22.0Q3.7600000000000002 22.0 2.88 21.119999999999997Q2.0 20.24 2.0 19.04V17.439999999999998L6.88 12.56Q7.76 11.68 9.0 11.68Q10.24 11.68 11.120000000000001 12.56L20.32 21.68Q19.68 22.0 19.04 22.0ZM16.0 10.48Q17.44 10.48 18.48 9.48Q19.52 8.48 19.52 7.0Q19.52 5.52 18.48 4.52Q17.44 3.5199999999999996 16.0 3.5199999999999996Q14.56 3.5199999999999996 13.52 4.52Q12.48 5.52 12.48 7.0Q12.48 8.48 13.52 9.48Q14.56 10.48 16.0 10.48ZM16.0 5.52Q16.64 5.52 17.08 5.959999999999999Q17.52 6.399999999999999 17.52 7.0Q17.52 7.600000000000001 17.08 8.040000000000001Q16.64 8.48 16.0 8.48Q15.36 8.48 14.92 8.040000000000001Q14.48 7.600000000000001 14.48 7.0Q14.48 6.399999999999999 14.92 5.959999999999999Q15.36 5.52 16.0 5.52Z\"/>", "mic": "<path d=\"M12.0 20.0Q14.16 20.0 16.0 18.92Q17.84 17.84 18.92 16.0Q20.0 14.16 20.0 12.0V8.0Q20.0 5.84 18.92 4.0Q17.84 2.16 16.0 1.08Q14.16 0.0 12.0 0.0Q9.84 0.0 8.0 1.08Q6.16 2.16 5.08 4.0Q4.0 5.84 4.0 8.0V12.0Q4.0 14.16 5.08 16.0Q6.16 17.84 8.0 18.92Q9.84 20.0 12.0 20.0ZM12.0 2.0Q14.16 2.0 15.84 3.4000000000000004Q17.52 4.800000000000001 17.92 7.039999999999999H15.040000000000001Q14.56 6.960000000000001 14.280000000000001 7.280000000000001Q14.0 7.600000000000001 14.0 8.0Q14.0 8.4 14.280000000000001 8.68Q14.56 8.959999999999999 14.96 9.04H18.0V10.959999999999999H15.040000000000001Q14.56 10.959999999999999 14.280000000000001 11.28Q14.0 11.6 14.0 12.0Q14.0 12.4 14.280000000000001 12.719999999999999Q14.56 13.04 14.96 13.04H17.92Q17.52 15.2 15.84 16.6Q14.16 18.0 12.0 18.0Q9.84 18.0 8.16 16.6Q6.48 15.2 6.08 13.04H9.040000000000001Q9.44 13.04 9.719999999999999 12.719999999999999Q10.0 12.4 10.0 12.0Q10.0 11.6 9.719999999999999 11.28Q9.44 10.959999999999999 8.96 10.959999999999999H6.0V8.959999999999999H9.040000000000001Q9.44 9.04 9.719999999999999 8.719999999999999Q10.0 8.4 10.0 8.0Q10.0 7.600000000000001 9.719999999999999 7.280000000000001Q9.44 6.960000000000001 8.96 6.960000000000001H6.08Q6.48 4.800000000000001 8.16 3.4000000000000004Q9.84 2.0 12.0 2.0ZM23.04 12.0Q22.56 12.0 22.28 12.280000000000001Q22.0 12.56 22.0 12.959999999999999Q22.0 15.44 20.8 17.52Q19.6 19.6 17.52 20.8Q15.44 22.0 13.040000000000001 22.0H11.040000000000001Q8.56 22.0 6.48 20.8Q4.4 19.6 3.2 17.52Q2.0 15.44 2.0 12.959999999999999Q2.0 12.56 1.72 12.280000000000001Q1.44 12.0 1.0 12.0Q0.56 12.0 0.28 12.280000000000001Q0.0 12.56 0.0 12.959999999999999Q0.0 16.0 1.48 18.52Q2.96 21.04 5.48 22.52Q8.0 24.0 10.96 24.0H13.040000000000001Q16.0 24.0 18.52 22.52Q21.04 21.04 22.52 18.52Q24.0 16.0 24.0 13.04Q24.0 12.56 23.72 12.280000000000001Q23.44 12.0 23.04 12.0Z\"/>"};
if(typeof ICON_PATHS!=="undefined")Object.assign(ICON_PATHS,FLATICON_PATHS);
if(typeof ICONS!=="undefined")Object.assign(ICONS,FLATICON_PATHS);

/* ===== src/js/04-refinement-v3.js ===== */
// Scout's expressions, product composition and interruption-safe page motion.
const SCOUT_ASSETS={calm:'assets/scout.png',listening:'assets/scout-listening.png',happy:'assets/scout-happy.png',support:'assets/scout-support.png'};
let scoutReaction='calm',scoutTyping=false,scoutReplyTimer=null,refinedPage=null,motionBack=false,pageAnimations=[];
function scoutEmotion(){if(screen==='scout')return scoutBusy?'thinking':scoutTyping?'listening':scoutReaction;if(screen==='emergency'||current().urgency==='urgent'&&['home','triage-result'].includes(screen))return 'support';if(['awards','award','history-case','intro-privacy'].includes(screen)||screen==='care-result'&&current().carePassed)return 'happy';if(['triage','triage-result','care','intro-help','case'].includes(screen))return 'listening';return 'calm';}
function scoutImage(emotion='calm',className=''){return `<img class="${className}" data-scout-image src="${SCOUT_ASSETS[emotion==='thinking'?'listening':emotion]||SCOUT_ASSETS.calm}" alt="${T('Скаут','Scout')}">`;}
function scoutResponse(m){if(m.role==='self')return `<div class="scout-user-message">${e(m.text)}</div>`;return `<article class="scout-response ${m.role==='system'?'system':''}"><div class="response-author"><span class="scout-dot"></span>${m.role==='system'?T('Диалог','Conversation'):T('Скаут','Scout')}</div><p>${e(m.text)}</p>${m.card?`<div class="response-action ${m.card.kind==='urgent'?'urgent':''}"><div><small>${T('Следующий шаг','Next step')}</small><h3>${e(m.card.title)}</h3></div><button class="icon-button" ${m.card.target==='emergency'?'data-action="urgent"':`data-go="${e(m.card.target)}"`} aria-label="${e(m.card.label)}">${I('arrow')}</button></div>`:''}</article>`;}
const starterMessages=()=>[{role:'scout',text:T('Я рядом. Расскажите, что происходит, или выберите, с чего начнём.','I’m here. Tell me what is happening, or choose where to start.')}];
V.scout=()=>{const emotion=scoutEmotion(),messages=state.scoutMessages.filter(m=>m.caseId===state.current);return `<div class="scout-hub"><div class="scout-scene" data-emotion="${emotion}"><div class="scout-heading"><span>${T('Ваш ИИ-помощник','Your AI assistant')}</span><h1>${T('Скаут','Scout')}</h1></div><div class="scout-halo"></div><div class="scout-orbit"></div><button class="scout-character" data-scout-action="greet" aria-label="${T('Поздороваться со Скаутом','Say hello to Scout')}">${scoutImage(emotion)}</button><span class="scout-floating-context">${I('shield')}<span>${state.cases.length?'#'+current().number:T('Начнём вместе','Let’s start together')}</span></span><div class="scout-presence" role="status"><span></span><b>${scoutBusy?T('Обдумываю ваш вопрос','Thinking about your question'):scoutTyping?T('Внимательно слушаю','Listening carefully'):emotion==='happy'?T('Рад быть рядом','Glad to be here'):emotion==='support'?T('Давайте спокойно, я рядом','Let’s take it calmly, I’m here'):T('Я здесь. Один шаг за раз.','I’m here. One step at a time.')}</b></div></div><div class="scout-quick-deck"><button class="scout-quick primary" data-scout-prompt="assess">${I('target')}<span>${T('Что делать?','What now?')}<small>${T('Первый шаг','First step')}</small></span>${I('arrow')}</button><button class="scout-quick" data-scout-prompt="support">${I('heart')}<span>${T('Я волнуюсь','I’m worried')}</span></button><button class="scout-quick" data-scout-prompt="help">${I('map')}<span>${T('Найти помощь','Find help')}</span></button></div><div class="scout-thread" id="scout-thread" tabindex="0" aria-label="${T('Сообщения со Скаутом','Messages with Scout')}"><div id="scout-messages">${(messages.length?messages:starterMessages()).map(scoutResponse).join('')}</div>${scoutBusy?`<div class="scout-thinking" role="status" aria-label="${T('Скаут готовит ответ','Scout is preparing a reply')}"><i></i><i></i><i></i></div>`:''}</div><p class="scout-footnote">${T('не ставлю диагнозы и не назначаю лечение','I do not diagnose or prescribe treatment')}</p></div>`;};
V.settings=()=>`<h1>${T('Настройки','Settings')}</h1><section class="card settings-card"><div class="settings-section-title">${I('sun')}<h3>${T('Внешний вид','Appearance')}</h3></div><div class="settings-actions">${button(theme==='light'?T('Включить тёмную тему','Use dark theme'):T('Включить светлую тему','Use light theme'),'theme','secondary')}${button(T('Язык: русский → English','Language: English → русский'),'language','secondary')}</div><div class="settings-toggles">${[['reduceMotion',T('Уменьшить движение','Reduce motion')],['reduceTransparency',T('Уменьшить прозрачность','Reduce transparency')],['increaseContrast',T('Усилить контраст','Increase contrast')]].map(([id,label])=>`<label class="preference-row"><span>${label}</span><input type="checkbox" role="switch" data-pref="${id}" ${state.prefs[id]?'checked':''}></label>`).join('')}</div></section><section class="card settings-card"><div class="settings-section-title">${I('shield')}<h3>${T('Приватность','Privacy')}</h3></div><p>${T('Контакты скрыты по умолчанию. Согласие задаётся отдельно для каждого диалога.','Contacts are private by default. Consent is set separately for each conversation.')}</p><div class="settings-actions">${link(T('Согласие на контакты','Contact consent'),'consent','secondary')}</div></section><div class="settings-reset">${button(T('Сбросить данные','Reset data'),'reset','danger')}</div>`;
V.awards=()=>`<div class="award-hero"><div><small>${T('Ваши добрые шаги','Your helpful steps')}</small><h1>${T('Есть чем<br>гордиться','Something to<br>be proud of')}</h1><p>${T('Помощь важнее скорости.','Helping matters more than speed.')}</p></div>${scoutImage('happy')}</div><div class="award-summary"><span>${T('Ваш уровень','Your level')}</span><strong>${1+Object.keys(state.awards).length}</strong><small>${Object.keys(state.awards).length} / ${awardData().length} ${T('наград','awards')}</small></div><div class="award-list">${awardData().map(a=>`<button class="card card-link achievement-card" data-action="award:${a.id}"><div class="achievement-head"><span class="award-icon ${state.awards[a.id]?'':'locked'}">${I(state.awards[a.id]?'check':'shield')}</span><div><h3>${a.title}</h3><small>${state.awards[a.id]?T('Получено','Earned'):T('Впереди','Ahead')}</small></div><span class="achievement-arrow">${I('arrow')}</span></div><p>${a.rule}</p><div class="achievement-progress" role="progressbar" aria-valuemin="0" aria-valuemax="1" aria-valuenow="${state.awards[a.id]?1:0}" aria-label="${e(a.title)}"><i style="width:${state.awards[a.id]?100:0}%"></i></div><small class="caption">${state.awards[a.id]?T('1 из 1 · шаг выполнен','1 of 1 · completed'):T('0 из 1 · ещё можно помочь','0 of 1 · you can still help')}</small></button>`).join('')}</div>`;
const priorRefinementRender=render;
function updateScoutPresence(){if(screen!=='scout')return;const scene=app.querySelector('.scout-scene'),emotion=scoutEmotion();if(!scene)return;scene.dataset.emotion=emotion;const image=scene.querySelector('[data-scout-image]');image.src=SCOUT_ASSETS[emotion==='thinking'?'listening':emotion]||SCOUT_ASSETS.calm;scene.querySelector('.scout-presence b').textContent=scoutBusy?T('Обдумываю ваш вопрос','Thinking about your question'):scoutTyping?T('Внимательно слушаю','Listening carefully'):emotion==='support'?T('Давайте спокойно, я рядом','Let’s take it calmly, I’m here'):emotion==='happy'?T('Рад быть рядом','Glad to be here'):T('Я здесь. Один шаг за раз.','I’m here. One step at a time.');}
render=(focus=false)=>{const prev=app.querySelector('.screen'),changed=refinedPage!==screen;const reduced=state.prefs.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;let outgoing=null;if(changed&&prev&&!reduced){outgoing=prev.cloneNode(true);outgoing.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));outgoing.inert=true;outgoing.setAttribute('aria-hidden','true');outgoing.classList.add('screen-outgoing');const scrollingNodes=prev.querySelectorAll('.scroll-content,.scout-thread,.guided-thread,.guided-hot-topics');outgoing.querySelectorAll('.scroll-content,.scout-thread,.guided-thread,.guided-hot-topics').forEach((n,i)=>n.dataset.transitionScroll=scrollingNodes[i].scrollTop);}pageAnimations.forEach(a=>a.cancel());pageAnimations=[];priorRefinementRender(focus);const page=app.querySelector('.screen');page.classList.toggle('scout-screen',screen==='scout');page.classList.toggle('has-conversation',screen==='scout'&&state.scoutMessages.some(m=>m.caseId===state.current));page.classList.toggle('settings-screen',screen==='settings');page.classList.toggle('awards-screen',screen==='awards');page.dataset.page=screen;const emotion=scoutEmotion();page.querySelectorAll('img[src="assets/scout.png"]').forEach(n=>{if(!n.hasAttribute('data-scout-image'))n.src=SCOUT_ASSETS[emotion==='thinking'?'listening':emotion]||SCOUT_ASSETS.calm;});if(screen==='scout'){const thread=page.querySelector('.scout-thread');if(thread)thread.scrollTop=thread.scrollHeight;}if(changed&&outgoing&&!reduced){app.append(outgoing);outgoing.querySelectorAll('[data-transition-scroll]').forEach(n=>n.scrollTop=Number(n.dataset.transitionScroll));const exit=outgoing.animate([{opacity:1},{opacity:0}],{duration:380,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'});exit.onfinish=()=>outgoing.remove();exit.oncancel=()=>outgoing.remove();const enter=page.animate([{opacity:0},{opacity:1}],{duration:380,easing:'cubic-bezier(.22,.7,.2,1)'});pageAnimations.push(exit,enter);}refinedPage=screen;};
const priorRefinementGo=go;
go=(id,push=true)=>{motionBack=!push||['home','profile','case','nearby','chats'].includes(id)&&!['home','profile','case','nearby','chats'].includes(screen);if(screen==='scout'&&id!=='scout'){scoutTyping=false;if(scoutReplyTimer){clearTimeout(scoutReplyTimer);scoutReplyTimer=null;scoutBusy=false;}}priorRefinementGo(id,push);};
function replyFor(text){const stressed=/волную|страш|бою|паник|трево|worri|afraid|scared/i.test(text),thanks=/спасибо|получилось|наш[её]л[аи]? хозя|thank|done/i.test(text),help=/помощ|специал|клиник|help|clinic/i.test(text);let emotion=thanks?'happy':stressed||current().urgency==='urgent'?'support':'listening';let target=state.cases.length?'triage':'new-case',title=T('Спокойно оценим ситуацию','Let’s calmly assess the situation'),answer=T('Сначала убедитесь, что вы в безопасности. Расскажите, что видите со своего места. Начнём с короткой оценки.','First make sure you are safe. Tell me what you can see from where you are. Let’s start with a short assessment.');if(stressed){answer=T('Понимаю, это может пугать. Вам не нужно решать всё сразу. Останьтесь на безопасном расстоянии — начнём с одного шага.','I understand this can feel frightening. You do not need to solve everything at once. Stay at a safe distance — let’s take one step.');}if(help){target=state.cases.length?'helpers':'nearby';title=T('Посмотрим, кто может помочь','Let’s see who can help');answer=T('Помощника выбираем под ситуацию. Наличие на карте ещё не означает готовность принять животное — это согласуем отдельно.','Choose help for the situation. Being on the map does not mean someone can take the animal in — confirm that separately.');}if(thanks){target=state.cases.length?'route':'home';title=T('Посмотреть следующий шаг','See the next step');answer=T('Рад, что получилось. Ваш спокойный шаг уже важен. Давайте посмотрим, что ещё нужно по случаю.','I’m glad it worked out. Your calm action matters. Let’s see what else the case needs.');}if(current().urgency==='urgent'||restricted()||/сроч|не дыш|кровотеч|urgent|bleeding/i.test(text)){target='emergency';title=T('Связаться со специалистом','Contact a specialist');answer=T('Сейчас важны безопасность и специалист. Наблюдайте издалека и не приближайтесь ради проверки. Откроем подходящий контакт.','Safety and a specialist matter now. Observe from a distance and do not approach to check. Let’s find an appropriate contact.');emotion='support';}return {emotion,text:answer,card:{title,target,label:title,kind:target==='emergency'?'urgent':'normal'}};}
const priorRefinementPost=postMessage;
postMessage=text=>{if(screen!=='scout')return priorRefinementPost(text);if(scoutBusy||!text.trim())return;const caseId=state.current;state.scoutMessages.push({caseId,role:'self',text:text.trim(),en:text.trim(),at:new Date().toISOString()});scoutTyping=false;scoutBusy=true;persist();render();scoutReplyTimer=setTimeout(()=>{scoutReplyTimer=null;scoutBusy=false;const response=replyFor(text);scoutReaction=response.emotion;state.scoutMessages.push({caseId,role:'scout',text:response.text,en:response.text,card:response.card,at:new Date().toISOString()});persist();if(screen==='scout'&&state.current===caseId)render();},1100);};
const priorRefinementRefresh=refreshMessages;refreshMessages=()=>screen==='scout'?render():priorRefinementRefresh();
document.addEventListener('input',ev=>{if(screen==='scout'&&ev.target.id==='message-input'){scoutTyping=!!ev.target.value.trim();updateScoutPresence();}});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-scout-prompt],[data-scout-action],[data-action="stop-scout"]');if(!b)return;ev.stopImmediatePropagation();if(b.dataset.action==='stop-scout'){clearTimeout(scoutReplyTimer);scoutReplyTimer=null;scoutBusy=false;state.scoutMessages.push({caseId:state.current,role:'system',text:T('Ответ остановлен. Можно задать другой вопрос.','Reply stopped. You can ask another question.')});persist();render();return;}if(b.dataset.scoutAction==='greet'){if(scoutBusy)return;scoutReaction=scoutReaction==='happy'?'listening':'happy';updateScoutPresence();if(!state.prefs.reduceMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)b.animate([{transform:'translateX(-50%)'},{transform:'translate(-50%,-6px)'},{transform:'translateX(-50%)'}],{duration:420,easing:'ease-out'});return;}const prompts={assess:T('Что делать в первую очередь?','What should I do first?'),support:T('Я волнуюсь и не знаю, что делать','I’m worried and do not know what to do'),help:T('Помоги найти помощь рядом','Help me find help nearby')};postMessage(prompts[b.dataset.scoutPrompt]);},true);
const priorRefinementPrefs=applyPrefs;applyPrefs=()=>{priorRefinementPrefs();if(state.prefs.reduceMotion){pageAnimations.forEach(a=>a.cancel());pageAnimations=[];}};
window.podhvat.go=(...args)=>go(...args);window.podhvat.render=()=>render();window.podhvat.scout={send:text=>postMessage(text),emotion:()=>scoutEmotion()};
const refinementRenderWithDraft=render;
render=(focus=false)=>{const samePage=refinedPage===screen;const oldInput=app.querySelector('#message-input');const draft=oldInput?.value,hadFocus=document.activeElement===oldInput,selection=oldInput?.selectionStart;refinementRenderWithDraft(focus);const input=app.querySelector('#message-input');if(samePage&&input&&draft!==undefined){input.value=draft;const send=app.querySelector('#send-message');if(send)send.disabled=!draft.trim()||screen==='scout'&&scoutBusy;if(hadFocus){input.focus({preventScroll:true});input.setSelectionRange(selection,selection);}}app.querySelectorAll('[data-scout-prompt]').forEach(b=>b.disabled=scoutBusy);if(screen==='scout'){app.querySelector('.scroll-content').scrollTop=0;const thread=app.querySelector('.scout-thread'),last=thread?.querySelector('#scout-messages')?.lastElementChild;if(thread&&last){if(last.offsetHeight>thread.clientHeight){thread.scrollTop+=last.getBoundingClientRect().top-thread.getBoundingClientRect().top;}else thread.scrollTop=thread.scrollHeight;}}app.querySelectorAll('.screen:not(.screen-outgoing) .detail-traits>div').forEach((tile,i)=>{const target=['route','tasks','edit-animal'][i],replacement=document.createElement('button');replacement.className='trait-tile';replacement.dataset.go=target;replacement.innerHTML=tile.innerHTML+`<span class="trait-arrow">${I('arrow')}</span>`;tile.replaceWith(replacement);});};
render();
// Decode large local photos before revealing them; preserve the photo frame.
const refinementRenderWithPhotos=render;
render=(focus=false)=>{refinementRenderWithPhotos(focus);app.querySelectorAll('.screen:not(.screen-outgoing) .animal-photo').forEach(img=>{const reveal=()=>img.classList.add('photo-loaded');if(img.complete&&img.naturalWidth)img.decode().then(reveal).catch(reveal);else img.addEventListener('load',()=>img.decode().then(reveal).catch(reveal),{once:true});});};
for(const asset of Object.values(SCOUT_ASSETS)){const preload=new Image();preload.src=asset;}
render();

/* ===== src/js/05-scout-chat-v4.js ===== */
// Guided conversation: draft answers -> explicit summary -> saved case.
const CHAT_STEPS=[
 {id:'safety',question:'Начнём с безопасности. Вы сейчас можете наблюдать за животным с безопасного расстояния?',options:['Да, я в безопасности','Нет, мне небезопасно','Не уверен(а)']},
 {id:'group',question:'Кого вы встретили?',options:['Собаку','Кошку','Дикое животное','Сельскохозяйственное животное','Не могу определить']},
 {id:'condition',question:'Что заметно со стороны? Не приближайтесь ради проверки.',options:['Двигается, явной травмы не вижу','Вижу травму или необычное поведение','Не двигается / сильное кровотечение','Не могу оценить']},
 {id:'place',question:'Где вы встретили животное? Достаточно района, парка или ориентира. Точный адрес останется приватным.'},
 {id:'features',question:'Какие приметы вы заметили? Цвет, размер, ошейник — или напишите, что пока не можете рассмотреть.'},
 {id:'photo',question:'Можете добавить фотографию, сделанную с безопасного расстояния? Если это небезопасно, пропустим.',options:['Добавить фото','Пропустить фото']}
];
const chatPhotoCache=new Map(),photoPending=new Set();let guidedReplyTimer=null,homeSupportTimer=null,homeSupportIndex=0;
const HOME_SUPPORT=['Я рядом. Разберёмся шаг за шагом.','Вам не нужно знать все ответы заранее.','Начнём с того, что важно прямо сейчас.'];
function guidedSession(){if(!state.scoutGuided||state.scoutGuided.version!==1)state.scoutGuided={version:1,index:0,answers:{},messages:[],photos:[],complete:false,caseId:null,urgency:'ongoing',paused:false};return state.scoutGuided;}
function guidedAdd(role,text,extra={}){guidedSession().messages.push({id:'m'+Date.now()+Math.random().toString(16).slice(2),role,text,...extra});}
function guidedStart(){const s=guidedSession();if(!s.messages.length){guidedAdd('scout','Я Скаут. Помогу разобраться и соберу ваши ответы в карточку случая.');guidedAdd('scout',CHAT_STEPS[s.index].question);}persist();}
function guidedEmotion(){const s=guidedSession();if(scoutBusy)return'thinking';if(scoutTyping)return'listening';if(s.urgency!=='ongoing'||s.mood==='worried')return'support';if(s.complete||s.mood==='grateful')return'happy';return s.index?'listening':'calm';}
scoutEmotion=()=>screen==='scout'?guidedEmotion():screen==='home'?'calm':screen==='emergency'?'support':['awards','award','history-case'].includes(screen)?'happy':'listening';
function guidedSummary(){const s=guidedSession(),a=s.answers;return `<article class="guided-summary"><div class="summary-heading">${I('check')}</div><h2>${e(a.group||'Животное')}</h2>${s.photos.length&&chatPhotoCache.get(s.photos[0])?`<img class="summary-photo" src="${chatPhotoCache.get(s.photos[0])}" alt="Фото находки">`:''}<dl><div><dt>Место</dt><dd>${e(a.place||'Нужно уточнить')}</dd></div><div><dt>Приметы</dt><dd>${e(a.features||'Пока неизвестны')}</dd></div><div><dt>Наблюдение</dt><dd>${e(a.condition||'Нужно уточнить')}</dd></div></dl><div class="summary-next"><small>Следуйте этому плану</small><h3>${s.urgency==='urgent'?'Безопасность → специалист':/Дикое|Сельскохозяйственное/.test(a.group||'')?'Наблюдение издалека → специалист':'Приметы → проверка совпадений → помощь'}</h3></div><p>Сохраните карточку. Дальше я буду вести вас по одному шагу. Данные можно уточнить; публикация выполняется отдельно.</p>${s.caseId?`<button class="button" data-go="case">Открыть ваш случай</button>`:`<button class="button" data-guided="save">Сохранить и следовать плану</button>`}<button class="summary-edit" data-guided="revise">Уточнить ответы в чате</button></article>`;}
function guidedMessage(m){if(m.type==='summary')return guidedSummary();return `<article class="guided-message ${m.role==='self'?'self':''} ${m.role==='system'?'system':''}">${m.role==='scout'?'<small class="guided-author">Скаут</small>':''}${m.text?`<p>${e(m.text)}</p>`:''}${m.photoId?chatPhotoCache.get(m.photoId)?`<button class="guided-photo" data-guided-photo="${m.photoId}"><img src="${chatPhotoCache.get(m.photoId)}" alt="Прикреплённое фото находки"><span>Посмотреть фото</span></button>`:'<p>Загружаю ваше фото…</p>':''}</article>`;}
function guidedOptions(){const s=guidedSession();if(s.complete||s.paused||scoutBusy)return '';return `<div class="guided-options" role="group" aria-label="${T('Варианты ответа','Reply options')}"><span class="go-cap">${T('Выберите ответ','Choose a reply')}</span>${(CHAT_STEPS[s.index]?.options||[]).map(x=>`<button data-guided-answer="${e(x)}">${e(x)}</button>`).join('')}</div>`;}
V.scout=()=>{guidedStart();const s=guidedSession(),emotion=guidedEmotion();return `<div class="guided-chat"><div class="guided-scout" data-emotion="${emotion}"><h1>Скаут</h1>${scoutImage(emotion)}${scoutBusy?'<span class="guided-thinking" role="status" aria-label="Скаут готовит ответ"><i></i><i></i><i></i></span>':''}</div><div class="guided-thread" id="guided-thread" tabindex="0" aria-label="Переписка со Скаутом">${s.messages.map(guidedMessage).join('')}${guidedOptions()}</div></div>`;};
const v4Header=header,v4Dock=dock,v4Composer=composer;
header=()=>screen==='scout'?`<header class="app-header guided-header"><button data-action="back" class="guided-back">${I('back')}<span>Назад</span></button></header>`:v4Header();
dock=()=>screen==='scout'?'':v4Dock();
composer=()=>screen==='scout'?`<footer class="guided-footer"><nav class="guided-hot-topics" aria-label="Быстрые темы"><button class="urgent" data-guided="urgent">${I('warning')}Срочно</button><button data-guided="photo">${I('photo')}Фото</button><button data-guided="support">${I('heart')}Я волнуюсь</button><button data-guided="help">${I('map')}Помощь рядом</button><button data-guided="resume">${I('chat')}Продолжить</button>${guidedSession().complete?'<button data-guided="summary">Карточка</button>':''}</nav><form class="composer" id="message-form"><button class="icon-button" type="button" data-guided="photo" aria-label="Добавить фотографию">${I('photo')}</button><input id="message-input" autocomplete="off" aria-label="Сообщение Скауту" placeholder="Ответьте Скауту…" maxlength="1000"><button class="icon-button" type="submit" id="send-message" disabled aria-label="Отправить">${I('arrow')}</button>${scoutBusy?'<button class="icon-button" type="button" data-guided="stop" aria-label="Остановить ответ">'+I('close')+'</button>':''}</form><input id="guided-file" class="hidden" type="file" accept="image/jpeg,image/png,image/webp"></footer>`:v4Composer();
const v4Home=V.home;
V.home=()=>v4Home().replace(/<div class="scout-intro">[\s\S]*?<\/div>/,`<section class="home-scout-centred"><h1>Подхватим вместе</h1><div class="home-scout-art">${scoutImage('calm')}<span></span></div><p id="home-support">${HOME_SUPPORT[homeSupportIndex]}</p><button class="button home-ask" data-go="scout">Попросить помощи ${I('arrow')}</button></section>`);
function assessment(s){const a=s.answers;const urgent=s.userUrgent||/небезопасно|Не двигается|сильное кровотеч|не дыш|сроч/i.test((a.safety||'')+' '+(a.condition||''));s.urgency=urgent?'urgent':/травм|Не могу|Не уверен/i.test((a.safety||'')+' '+(a.condition||''))?'attention':'ongoing';}
function finishGuided(){const s=guidedSession();assessment(s);s.complete=true;s.paused=false;guidedAdd('scout','Я собрал ваши ответы. Проверьте карточку ниже и следуйте плану — я буду рядом.',{type:'text'});guidedAdd('scout','',{type:'summary'});}
function answerGuided(text){const s=guidedSession();if(!text.trim()||scoutBusy)return;const step=CHAT_STEPS[s.index];guidedAdd('self',text.trim());s.mood=/страш|бою|волную|трево/i.test(text)?'worried':/спасибо|получилось/i.test(text)?'grateful':null;scoutTyping=false;scoutBusy=true;persist();render();guidedReplyTimer=setTimeout(()=>{guidedReplyTimer=null;scoutBusy=false;if(/^(я )?(волнуюсь|боюсь|мне страшно|не знаю что делать)/i.test(text.trim())){guidedAdd('scout','Понимаю. Не нужно решать всё сразу. Останьтесь в безопасном месте — вернёмся к одному вопросу, когда будете готовы.');}else if(/^спасибо[!. ]*$/i.test(text.trim())){guidedAdd('scout','Рад быть рядом. Продолжим, когда будете готовы.');}else if(s.complete){guidedAdd('scout','Ответы уже собраны в карточку. Если нужно что-то исправить, нажмите «Уточнить ответы в чате».');}else if(s.paused){guidedAdd('scout','Я рядом. Нажмите «Продолжить», когда будете готовы вернуться к вопросам.');}else{if(step.id==='photo'){s.answers.photo='Пропущено';finishGuided();}else{s.answers[step.id]=step.id==='group'?normalizeGuidedAnimal(text):text.trim();assessment(s);s.index++;if(s.urgency==='urgent'){guidedAdd('scout','Сейчас важнее безопасность и специалист. Не приближайтесь ради проверки. Срочная помощь доступна кнопкой «Срочно» — отвечать дальше необязательно.');}if(s.index<CHAT_STEPS.length)guidedAdd('scout',CHAT_STEPS[s.index].question);else finishGuided();}}persist();if(screen==='scout')render();},650);}
const v4Post=postMessage;
postMessage=text=>screen==='scout'?answerGuided(text):v4Post(text);
function stopGuided(){if(!guidedReplyTimer)return;clearTimeout(guidedReplyTimer);guidedReplyTimer=null;scoutBusy=false;guidedAdd('system','Ответ остановлен. Вопрос остался прежним — можно ответить ещё раз.');persist();}
function saveGuided(){const s=guidedSession();if(!s.complete)return;if(!s.caseId){const a=s.answers,group=/Дикое/.test(a.group)?'wild':/Сельскохозяйственное/.test(a.group)?'farm':/Собаку|Кошку/.test(a.group)?'domestic':'unknown';const c=newCase(group,/Кошку/.test(a.group)?'cat':/Собаку/.test(a.group)?'dog':'other',a.place);c.features=a.features;c.featuresEN=a.features;c.urgency=s.urgency;c.step=1;c.scoutAssessment=a.condition;c.photo=s.photos[0]?'scout:'+s.photos[0]:null;c.synthetic=false;s.caseId=c.id;guidedAdd('scout','Карточка сохранена как черновик. Начните с ближайшего шага; публичного объявления пока нет.');persist();}else state.current=s.caseId;go('case');}
function photoDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('podhvat-photos',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function storePhoto(file){const db=await photoDB(),id=crypto.randomUUID();await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();chatPhotoCache.set(id,URL.createObjectURL(file));return id;}
async function hydratePhotos(){const ids=new Set([...guidedSession().photos,...state.cases.map(c=>c.photo?.startsWith('scout:')?c.photo.slice(6):null).filter(Boolean)]);for(const id of ids){if(chatPhotoCache.has(id)||photoPending.has(id))continue;photoPending.add(id);try{const db=await photoDB();const blob=await new Promise((resolve,reject)=>{const r=db.transaction('photos').objectStore('photos').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();if(blob)chatPhotoCache.set(id,URL.createObjectURL(blob));}catch{}finally{photoPending.delete(id);}if(chatPhotoCache.has(id)&&['scout','case','home','animal','media'].includes(screen))render();}}
const v4Photo=photo;
photo=(c,large=false)=>c.photo?.startsWith('scout:')?chatPhotoCache.has(c.photo.slice(6))?v4Photo({...c,photo:chatPhotoCache.get(c.photo.slice(6))},large):'<div class="photo-placeholder">Загружаю сохранённую фотографию…</div>':v4Photo(c,large);
const v4Go=go;
go=(id,push=true)=>{if(screen==='scout'&&id!=='scout')stopGuided();v4Go(id,push);};
const v4Render=render;
render=(focus=false)=>{document.body.classList.toggle('scout-immersive',screen==='scout');const wasChat=screen==='scout',oldInput=app.querySelector('#message-input'),draft=oldInput?.value,focused=document.activeElement===oldInput;v4Render(focus);if(wasChat){const thread=app.querySelector('#guided-thread');if(thread){const last=thread.querySelector('.guided-options')||thread.lastElementChild;thread.scrollTop=last&&last.offsetHeight>thread.clientHeight?thread.scrollTop+last.getBoundingClientRect().top-thread.getBoundingClientRect().top:thread.scrollHeight;}const input=app.querySelector('#message-input');if(draft&&input&&oldInput?.closest('.guided-footer')){input.value=draft;app.querySelector('#send-message').disabled=scoutBusy;if(focused)input.focus({preventScroll:true});}app.querySelectorAll('[data-guided-answer]').forEach(n=>n.disabled=scoutBusy);}clearInterval(homeSupportTimer);homeSupportTimer=null;if(screen==='home')homeSupportTimer=setInterval(()=>{homeSupportIndex=(homeSupportIndex+1)%HOME_SUPPORT.length;const p=app.querySelector('#home-support');if(p){p.textContent=HOME_SUPPORT[homeSupportIndex];if(!state.prefs.reduceMotion&&!matchMedia('(prefers-reduced-motion:reduce)').matches)p.animate([{opacity:.2},{opacity:1}],{duration:350});}},5000);hydratePhotos();};
document.addEventListener('click',event=>{const b=event.target.closest('[data-guided],[data-guided-answer],[data-guided-photo]');if(!b)return;if(['help','urgent','revise'].includes(b.dataset.guided)){event.stopPropagation();}else event.stopImmediatePropagation();event.preventDefault();if(b.dataset.guidedPhoto){openModal('Фото находки',`<img src="${chatPhotoCache.get(b.dataset.guidedPhoto)}" style="width:100%;max-height:65vh;object-fit:contain" alt="Ваше фото">`,button('Закрыть','dismiss','secondary'));return;}if(b.dataset.guidedAnswer){if(b.dataset.guidedAnswer==='Добавить фото'){app.querySelector('#guided-file').click();return;}answerGuided(b.dataset.guidedAnswer);return;}const s=guidedSession();switch(b.dataset.guided){case'photo':app.querySelector('#guided-file').click();break;case'save':saveGuided();break;case'stop':stopGuided();render();break;case'support':stopGuided();s.mood='worried';guidedAdd('self','Я волнуюсь');guidedAdd('scout','Понимаю. Не нужно решать всё сразу. Останьтесь в безопасном месте. Когда будете готовы, вернёмся к одному вопросу.');persist();render();break;case'help':stopGuided();guidedAdd('self','Мне нужна помощь рядом');guidedAdd('scout','После оценки подберём подходящего помощника. Если помощь нужна прямо сейчас, нажмите «Срочно».');persist();render();break;case'urgent':stopGuided();s.userUrgent=true;s.urgency='urgent';s.mood='worried';s.paused=true;guidedAdd('scout','Не подвергайте себя риску. Свяжитесь с подходящим специалистом. В этой приложении реальные звонки не выполняются.');guidedAdd('scout','При непосредственной угрозе вашей безопасности используйте местную экстренную службу. Для животного — ветеринарную или профильную службу.',{type:'urgent'});persist();render();break;case'resume':stopGuided();s.paused=false;guidedAdd('scout',s.complete?'Карточка уже готова. Проверьте данные и сохраните её.':CHAT_STEPS[s.index].question);persist();render();break;case'summary':guidedAdd('scout','',{type:'summary'});persist();render();break;case'revise':stopGuided();s.complete=false;s.paused=false;s.index=0;guidedAdd('scout','Уточним данные по порядку. Карточку обновлю после ответов.');guidedAdd('scout',CHAT_STEPS[0].question);persist();render();break;}},true);
document.addEventListener('change',async event=>{if(event.target.id!=='guided-file')return;const file=event.target.files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){toast('Выберите JPEG, PNG или WebP до 8 МБ.');return;}try{const id=await storePhoto(file),s=guidedSession();s.photos.push(id);guidedAdd('self','Фото с безопасного расстояния',{photoId:id});guidedAdd('scout','Фото прикреплено. Я не делаю выводов о травмах по снимку — опираюсь на ваши наблюдения.');if(CHAT_STEPS[s.index]?.id==='photo'&&!s.complete){s.answers.photo='Добавлено';finishGuided();}persist();render();}catch{toast('Не удалось сохранить фото. Попробуйте другой файл или продолжите без фотографии.');}});
window.podhvat.go=(...args)=>go(...args);window.podhvat.render=()=>render();window.podhvat.scout={send:text=>postMessage(text),emotion:()=>scoutEmotion(),session:()=>guidedSession()};
render();
document.addEventListener('input',event=>{if(screen==='scout'&&event.target.id==='message-input'){const emotion=guidedEmotion(),scene=app.querySelector('.guided-scout'),img=scene?.querySelector('img');if(scene)scene.dataset.emotion=emotion;if(img)img.src=SCOUT_ASSETS[emotion==='thinking'?'listening':emotion]||SCOUT_ASSETS.calm;}});
for(const id of ['media','flyer']){const original=V[id];V[id]=()=>{const c=current();if(!c.photo?.startsWith('scout:'))return original();const ref=c.photo,resolved=chatPhotoCache.get(ref.slice(6));if(!resolved)return '<h1>Фото</h1><p>Загружаю сохранённую фотографию…</p>';c.photo=resolved;try{return original();}finally{c.photo=ref;}};}
const originalV4Export=exportFlyer;exportFlyer=async()=>{const c=current();if(!c.photo?.startsWith('scout:'))return originalV4Export();const ref=c.photo,resolved=chatPhotoCache.get(ref.slice(6));if(!resolved){toast('Фотография ещё загружается.');return;}const blob=await fetch(resolved).then(r=>r.blob());const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});c.photo=data;try{originalV4Export();}finally{c.photo=ref;}};
function guidedCase(){const s=guidedSession(),a=s.answers,group=/Дикое/.test(a.group)?'wild':/Сельскохозяйственное/.test(a.group)?'farm':/Собаку|Кошку/.test(a.group)?'domestic':'unknown';let c=state.cases.find(c=>c.id===s.caseId&&c.lifecycle!=='closed');if(!c)c=newCase(group,/Кошку/.test(a.group)?'cat':/Собаку/.test(a.group)?'dog':'other',a.place);Object.assign(c,{group,publicPlace:a.place||'Место уточняется',features:a.features||'',featuresEN:a.features||'',urgency:s.urgency,step:Math.max(c.step,1),scoutAssessment:a.condition||'Не оценено',photo:s.photos[0]?'scout:'+s.photos[0]:null,synthetic:false});s.caseId=c.id;state.current=c.id;persist();return c;}
saveGuided=()=>{if(!guidedSession().complete)return;guidedCase();guidedSession().saved=true;persist();go('case');};
const originalGuidedSummary=guidedSummary;guidedSummary=()=>{const s=guidedSession();let html=originalGuidedSummary();if(s.caseId&&!s.saved)html=html.replace('<button class="button" data-go="case">Открыть ваш случай</button>','<button class="button" data-guided="save">Обновить и следовать плану</button>');return html;};
const originalGuidedMessage=guidedMessage;guidedMessage=m=>m.type==='contacts'?`<article class="guided-message"><small class="guided-author">Скаут</small><p>Примеры подходящих служб. Это локальные данные, не живой поиск и не подтверждение готовности принять животное.</p><div class="guided-contact-list">${helpers.filter(h=>h.kind==='organization'&&(/Дикое|Сельскохозяйственное/.test(guidedSession().answers.group||'')?h.type==='specialist':h.groups.includes('unknown'))).map(h=>`<button data-guided-contact="${h.id}"><span><strong>${e(h.name)}</strong><small>${e(h.tag)} · локальный запрос</small></span>${I('arrow')}</button>`).join('')}</div></article>`:originalGuidedMessage(m);
document.addEventListener('click',event=>{const b=event.target.closest('[data-guided="help"],[data-guided="urgent"],[data-guided="revise"],[data-guided-contact]');if(!b)return;if(b.dataset.guided==='revise'){guidedSession().saved=false;persist();return;}if(b.dataset.guided==='help'||b.dataset.guided==='urgent'){guidedAdd('scout','',{type:'contacts'});persist();setTimeout(()=>{if(screen==='scout')render();},0);return;}event.stopImmediatePropagation();stopGuided();guidedCase();helperId=b.dataset.guidedContact;requestHelper();go('scout',false);guidedAdd('scout','Локальный запрос создан. Он ожидает согласования; приём животного ещё не подтверждён. Реального сообщения не отправлялось.');persist();render();},true);
const guidedMessageWithHistory=guidedMessage;guidedMessage=m=>m.type==='summary'&&(!guidedSession().complete||guidedSession().messages.filter(x=>x.type==='summary').at(-1)?.id!==m.id)?'':guidedMessageWithHistory(m);
function normalizeGuidedAnimal(text){return /собак|п[её]с|dog/i.test(text)?'Собаку':/кот|кош|cat/i.test(text)?'Кошку':/сельск|корова|лошад|овца|farm/i.test(text)?'Сельскохозяйственное животное':/дик|лиса|лис[уы]|енот|wild/i.test(text)?'Дикое животное':text.trim();}
assessment=s=>{const a=s.answers,condition=a.condition||'',safety=a.safety||'',normal=/Двигается, явной травмы не вижу|ходит нормально|бегает нормально|травм не вижу/i.test(condition);s.urgency=s.userUrgent||/небезопасно|не двига|не дыш|сильное кров|без сознани|сроч/i.test(safety+' '+condition)?'urgent':/не уверен|не могу/i.test(safety)||condition&&!normal?'attention':'ongoing';};
const v4LocalMedia=V.media;V.media=()=>{const c=current();if(!c.photo?.startsWith('scout:'))return v4LocalMedia();const ids=guidedSession().caseId===c.id?guidedSession().photos:[c.photo.slice(6)];return '<h1>Фото находки</h1>'+ids.map(id=>chatPhotoCache.has(id)?`<img class="viewer-img" src="${chatPhotoCache.get(id)}" alt="Ваше фото находки"><p class="caption">Фото сохранено локально на устройстве.</p>`:'<p>Загружаю фотографию…</p>').join('');};
// Intro -> active conversation; assistant portraits travel with their messages.
const addGuidedWithEmotion=guidedAdd;
guidedAdd=(role,text,extra={})=>{const emotion=guidedSession().complete?'happy':guidedSession().urgency!=='ongoing'||guidedSession().mood==='worried'?'support':guidedSession().index?'listening':'calm';addGuidedWithEmotion(role,text,{emotion,...extra});};
function guidedIsActive(){const s=guidedSession();return !!s.active||s.index>0||s.messages.some(m=>m.role==='self');}
const messageWithAvatar=guidedMessage;
guidedMessage=m=>{const html=messageWithAvatar(m);if(!html||m.role!=='scout')return html;const emotion=m.emotion||(m.type==='summary'?'happy':/Понимаю|безопасность|Не подвергайте/.test(m.text||'')?'support':'listening');return `<div class="guided-assistant-row"><img class="guided-avatar" src="${SCOUT_ASSETS[emotion]||SCOUT_ASSETS.calm}" alt="Скаут"><div class="guided-assistant-body">${html}</div></div>`;};
const activeGuidedView=V.scout;
V.scout=()=>activeGuidedView().replace('class="guided-chat"',`class="guided-chat ${guidedIsActive()?'guided-active':''}"`)+(scoutBusy&&guidedIsActive()?'<div class="guided-pending" role="status" aria-label="Скаут готовит ответ"><img class="guided-avatar" src="'+SCOUT_ASSETS.listening+'" alt=""><span><i></i><i></i><i></i></span></div>':'');
const activeGuidedRender=render;let introCollapseAnimation=null;
render=(focus=false)=>{const hero=app.querySelector('.guided-scout'),heroHeight=hero?.getBoundingClientRect().height||0,tagOffset=app.querySelector('.guided-hot-topics')?.scrollLeft||0;introCollapseAnimation?.cancel();introCollapseAnimation=null;activeGuidedRender(focus);if(screen!=='scout')return;const tags=app.querySelector('.guided-hot-topics');if(tags){tags.scrollLeft=tagOffset;tags.addEventListener('wheel',event=>{if(tags.scrollWidth>tags.clientWidth&&Math.abs(event.deltaY)>Math.abs(event.deltaX)){const before=tags.scrollLeft;tags.scrollLeft+=event.deltaY;if(tags.scrollLeft!==before)event.preventDefault();}},{passive:false});}const pending=app.querySelector('.guided-pending'),thread=app.querySelector('.guided-thread');if(pending&&thread){thread.append(pending);thread.scrollTop=thread.scrollHeight;}if(guidedIsActive()&&heroHeight>1&&!state.prefs.reduceMotion&&!matchMedia('(prefers-reduced-motion:reduce)').matches){const next=app.querySelector('.guided-scout');introCollapseAnimation=next.animate([{flexBasis:heroHeight+'px',opacity:1,transform:'translateY(0)'},{flexBasis:'0px',opacity:0,transform:'translateY(-8px)'}],{duration:320,easing:'cubic-bezier(.22,.7,.2,1)'});}};
document.addEventListener('focusin',event=>{if(screen==='scout'&&event.target.id==='message-input'&&!guidedIsActive()){guidedSession().active=true;persist();render();}});
window.podhvat.render=()=>render();
render();

/* ===== src/js/06-header-blur.js ===== */
// Keep the floating title legible when a light card passes underneath it.
function updateHeaderInk(){const page=app.querySelector('.screen:not(.screen-outgoing)'),header=page?.querySelector('.app-header'),title=header?.querySelector('.header-center');if(!title)return;const r=title.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;const surfaces=[...page.querySelectorAll('.card,.empty-case-card,.stage-preview,.list-row,.case-next,.detail-forecast,.trait-tile,.award-summary,.notice,button')].filter(el=>{const b=el.getBoundingClientRect();return b.left<=x&&b.right>=x&&b.top<=y&&b.bottom>=y;}).sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height);let bg=surfaces.map(el=>getComputedStyle(el).backgroundColor).find(c=>!c.includes('rgba')&&c!=='transparent');if(!bg){header.style.setProperty('--header-ink',page.classList.contains('review-air')?'#fff':theme==='dark'?'#fff':'#17191b');return;}const rgb=bg.match(/[\d.]+/g)?.slice(0,3).map(Number);if(rgb)header.style.setProperty('--header-ink',rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>150?'#17191b':'#fff');}
const renderBeforeHeaderBlur=render;
render=(focus=false)=>{renderBeforeHeaderBlur(focus);const area=app.querySelector('.screen:not(.screen-outgoing)>.scroll-content');area?.addEventListener('scroll',updateHeaderInk,{passive:true});updateHeaderInk();};
window.podhvat.render=()=>render();render();

/* ===== src/js/07-icon-credits.js ===== */
// Prototype settings omit the credits card at the owner's request.
// Attribution and license remain in the design library and project documentation.

/* ===== src/js/08-self-help.js ===== */
// Short editorial guides and local topic matching for the Scout demo.
const SELF_HELP=[
{id:'first',title:'Нашли животное. С чего начать?',tag:'Первый шаг',icon:'shield',tone:'lime',cover:'assets/dog.png',time:1,lead:'Сначала — ваша безопасность. Не нужно решать всё сразу.',steps:[['Останьтесь в безопасном месте','Наблюдайте со стороны. Не выходите на проезжую часть и не приближайтесь ради проверки.'],['Запишите то, что видно','Вид животного, приметы и примерный район. Ответ «не знаю» лучше догадки.'],['Выберите следующий шаг','Если видите травму или не можете оценить состояние, свяжитесь с ветеринарной или профильной службой. Иначе начните карточку случая.']],note:'Не пытайтесь удерживать испуганное животное. Согласуйте действия со специалистом.',source:'https://www.rspca.org.uk/en/adviceandwelfare/pets/lost/dog',sourceName:'RSPCA · найденная собака',match:/перв|наш[её]л|нашла|встрет|начать|с чего/i},
{id:'injured',title:'Вижу травму. Что дальше?',tag:'Срочно',icon:'warning',tone:'urgent',time:1,lead:'При видимой травме чтение памятки не должно откладывать обращение за помощью.',steps:[['Сохраните дистанцию','Испуганное или травмированное животное может защищаться. Не приближайтесь ради осмотра.'],['Свяжитесь со специалистом','Опишите видимые признаки и место. Для домашнего животного — ветеринарная служба, для дикого — профильный специалист.'],['Следуйте согласованным указаниям','Не назначайте лекарства и не пытайтесь лечить самостоятельно. Уточните, кто готов помочь и куда можно обратиться.']],note:'Если опасность угрожает людям, обратитесь в местную экстренную службу. Скаут не ставит диагноз.',source:'https://www.rspca.org.uk/adviceandwelfare/wildlife/injured',sourceName:'RSPCA · помощь травмированным животным',match:/травм|ранен|кров|не двига|не дыш|сроч/i},
{id:'cat',title:'Кошка во дворе — потерялась?',tag:'Кошка',icon:'search',tone:'air',cover:'assets/cat.png',time:2,lead:'Кошка на улице может иметь дом. Одного наблюдения недостаточно, чтобы считать её бездомной.',steps:[['Посмотрите со стороны','Запишите приметы и место. Не пытайтесь поймать кошку только ради проверки.'],['Проверьте объявления','Сравните сообщения о пропаже и спросите соседей, знакомо ли им животное. Не публикуйте точные личные контакты.'],['Уточните проверку чипа','Ветеринарная служба может помочь с проверкой микрочипа. Сначала согласуйте безопасные действия и возможность приёма.']],note:'Если видите травму или кошка выглядит неблагополучно, обратитесь к специалисту, не дожидаясь результата поиска.',source:'https://www.bluecross.org.uk/advice/cat/wellbeing-and-care/what-to-do-with-a-stray-cat',sourceName:'Blue Cross · найденная кошка',match:/кош|кот|кот[её]нок/i},
{id:'wild',title:'Дикое животное рядом',tag:'Наблюдать издалека',icon:'map',tone:'ink',time:1,lead:'Для диких и сельскохозяйственных животных нужен профильный специалист.',steps:[['Не приближайтесь','Наблюдайте из безопасного места. Не пытайтесь поймать, поднять или самостоятельно перевезти животное.'],['Сохраните ориентир','Запишите район, заметное место и видимые признаки. Фото — только если его можно сделать безопасно.'],['Найдите профильную службу','Передайте наблюдения специалисту по этому виду животных. Дальнейшие действия согласуйте с ним.']],note:'Присутствие помощника на карте не означает, что он имеет опыт работы с этим видом или готов принять животное.',source:'https://www.rspca.org.uk/adviceandwelfare/wildlife/injured',sourceName:'RSPCA · дикие животные',match:/дик|птиц|[её]ж|лис|сельскохозяй|лошад|корова/i},
{id:'owner',title:'Как проверить владельца?',tag:'Поиск хозяина',icon:'user',tone:'lime',time:2,lead:'Похожая фотография — повод проверить сведения, а не подтверждение владения.',steps:[['Сравните приметы','Попросите фотографии, сделанные до находки, и описание отличительных признаков. Часть примет оставьте для проверки.'],['Уточните подтверждения','Документы, номер чипа и сведения из реестра помогают проверить связь человека с животным. Сомнения обсудите со специалистом.'],['Согласуйте передачу','Сначала подтвердите сведения и безопасный способ встречи. В приложении контакты раскрываются только по отдельному согласию.']],note:'Не отправляйте личные документы в публичные объявления. Не передавайте животное только на основании совпадения в поиске.',source:'https://www.bluecross.org.uk/advice/pets/wellbeing-and-care/microchipping-your-dog-or-cat',sourceName:'Blue Cross · микрочип и идентификация',match:/хозя|владел|чип|документ|проверить|совпад/i},
{id:'photo',title:'Фото, которое поможет поиску',tag:'Приметы',icon:'photo',tone:'air',cover:'assets/dog.png',time:1,lead:'Покажите заметные приметы, сохраняя безопасную дистанцию.',steps:[['Не приближайтесь ради кадра','Используйте увеличение, если оно доступно. Если фото небезопасно, пропустите его и опишите наблюдение.'],['Проверьте, что видно','Для карточки полезны общий вид, цвет, размер и заметные особенности. Не дорисовывайте и не меняйте приметы на фото.'],['Уберите лишние данные','Перед публикацией проверьте, нет ли чужих лиц, номеров телефонов и точного приватного адреса.']],note:'Публикация карточки — отдельное действие.',source:null,match:/фото|сним|кадр|примет|описан/i},
{id:'care',title:'Временная забота без риска',tag:'Передержка',icon:'home',tone:'lime',time:2,lead:'Готовность помочь и возможность безопасной передержки — разные вещи.',steps:[['Уточните условия','Обсудите со специалистом вид животного, его состояние и подходящие условия размещения.'],['Согласуйте помощь','Уточните, кто принимает животное, где и на какой срок. Предложение помощи ещё не означает подтверждённый приём.'],['Обсудите уход','Кормление и уход зависят от вида и состояния. Получите подходящие указания ветеринара; не назначайте лекарства.']],note:'Для дикого или сельскохозяйственного животного выбирайте профильную службу. Эта памятка не инструкция по лечению.',source:null,match:/корм|вод|еда|уход|передерж|забот|приют|лекар/i},
{id:'bite',title:'Животное защищается',tag:'Безопасность',icon:'shield',tone:'urgent',time:1,lead:'Не нужно проверять, получится ли подойти ближе.',steps:[['Остановите попытку контакта','Останьтесь на расстоянии. Не провоцируйте животное и не пытайтесь удержать его.'],['Предупредите о ситуации','Сообщите специалисту о поведении и месте. Не направляйте неподготовленного помощника на самостоятельный захват.'],['При травме человека обратитесь за помощью','Если человек укушен или травмирован, обратитесь за медицинской помощью. При непосредственной угрозе — в местную экстренную службу.']],note:'Поведение не позволяет поставить диагноз. Безопасность людей важнее сбора подробностей.',source:null,match:/укус|агресс|рычит|куса|защища/i},
{id:'support',title:'Я волнуюсь. Один шаг за раз',tag:'Для вас',icon:'heart',tone:'air',cover:'assets/scout-support.png',time:1,lead:'Не нужно знать все ответы заранее. Можно сделать паузу и попросить помощи.',steps:[['Выберите безопасное место','Не оставайтесь рядом с животным из чувства обязанности, если вам небезопасно.'],['Разделите задачу','Сейчас достаточно одного действия: записать ориентир, сообщить специалисту или описать Скауту то, что видно.'],['Подключите поддержку','Попросите человека, которому доверяете, помочь с организацией. Скаут сохранит ход разговора — можно вернуться позже.']],note:'Эта подсказка для поддержки в ситуации, а не замена профессиональной помощи.',source:null,match:/волную|страш|бою|паник|тревож|пережива/i},
{id:'lost',title:'Мой питомец пропал',tag:'Поиск',icon:'search',tone:'ink',cover:'assets/cat.png',time:2,lead:'Соберите понятное описание и проверяйте сообщения о находках.',steps:[['Подготовьте сведения','Выберите свежую фотографию, запишите приметы, последний известный район и время наблюдения.'],['Сообщите о пропаже','Проверьте местные группы и службы. Если питомец чипирован, уведомите реестр, в котором зарегистрирован чип.'],['Проверяйте возможные находки','Сопоставляйте особые приметы и фотографии. Уточняйте сведения до встречи и передачи персональных данных.']],note:'Публичное объявление не должно раскрывать лишние приватные данные. Не считайте неподтверждённое сообщение установленным фактом.',source:'https://www.bluecross.org.uk/advice/cat/wellbeing-and-care/what-to-do-if-your-cat-is-lost',sourceName:'Blue Cross · поиск пропавшей кошки',match:/пропал|потерял|потеряла|мой питом|ищу/i}
];
let selfHelpQuery='',selfHelpFilter='all';
const helpArticle=id=>SELF_HELP.find(a=>a.id===id)||SELF_HELP[0];
const helpCover=a=>`<div class="help-cover ${a.tone}">${a.cover?`<img src="${a.cover}" alt="" loading="lazy">`:`<span class="help-cover-symbol">${I(a.icon)}</span>`}<span class="help-cover-time">${a.time} мин</span></div>`;
const helpTile=a=>`<button class="help-tile" data-help-article="${a.id}">${helpCover(a)}<span class="help-tile-body"><strong>${e(a.title)}</strong><span class="help-tag ${a.tone==='urgent'?'urgent':''}">${e(a.tag)}</span></span></button>`;
function helpResults(){const q=selfHelpQuery.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');return SELF_HELP.filter(a=>(selfHelpFilter==='all'||(selfHelpFilter==='urgent'?a.tone==='urgent':a.id===selfHelpFilter))&&(!q||[a.title,a.tag,a.lead,...a.steps.flat()].join(' ').toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q)));}
function helpResultHTML(){const results=helpResults();return `<small class="help-result-count" role="status">${results.length} из ${SELF_HELP.length} подсказок</small>${results.length?`<div class="help-grid">${results.map(helpTile).join('')}</div>`:`<div class="card help-empty">${I('search')}<h3>Пока ничего не нашли</h3><p>Попробуйте «фото», «кошка» или «безопасность».</p><button class="button secondary" data-help-clear>Показать все статьи</button></div>`}`;}
V.knowledge=()=>`<h1>Самопомощь</h1><p class="help-lead">Короткие подсказки, когда важно понять следующий шаг.</p><label class="help-search">${I('search')}<input id="help-search" type="search" placeholder="Поиск по статьям" aria-label="Поиск по статьям" value="${e(selfHelpQuery)}" maxlength="120" autocomplete="off"></label><nav class="help-filters" aria-label="Темы статей">${[['all','Все'],['urgent','Срочно'],['cat','Кошка'],['owner','Хозяин'],['support','Для вас']].map(([id,label])=>`<button data-help-filter="${id}" aria-pressed="${selfHelpFilter===id}" class="${selfHelpFilter===id?'selected':''}">${label}</button>`).join('')}</nav><div id="help-results">${helpResultHTML()}</div>`;
V.article=()=>{const a=helpArticle(articleId);return `<article class="help-reading">${helpCover(a)}<div class="help-reading-meta"><span class="help-tag ${a.tone==='urgent'?'urgent':''}">${e(a.tag)}</span><small>${a.time} мин чтения</small></div><h1>${e(a.title)}</h1><p class="help-reading-lead">${e(a.lead)}</p><section class="card help-steps"><h2>Что можно сделать</h2>${a.steps.map(([title,body],i)=>`<div class="help-step"><span>${i+1}</span><div><h3>${e(title)}</h3><p>${e(body)}</p></div></div>`).join('')}</section><aside class="help-caution">${I(a.tone==='urgent'?'warning':'shield')}<p>${e(a.note)}</p></aside><button class="button" data-help-ask="${a.id}">Обсудить со Скаутом ${I('chat')}</button>${a.tone==='urgent'?'<button class="button secondary" data-go="emergency">Нужна срочная помощь</button>':''}<section class="help-related"><h2>Может пригодиться</h2><div class="help-grid">${SELF_HELP.filter(x=>x.id!==a.id).slice(a.id==='first'?1:0,a.id==='first'?3:2).map(helpTile).join('')}</div></section><details class="help-editorial"><summary>О подсказке и источниках</summary><p>Короткая редакционная памятка для прототипа. Скаут не ставит диагнозы. Действия с животным согласуйте с подходящим специалистом.</p>${a.source?`<a href="${a.source}" target="_blank" rel="noopener">${e(a.sourceName)}</a><p>Местные службы и порядок обращения зависят от региона.</p>`:'<p>Основы: безопасность, приватность и согласование помощи в «Подхвате».</p>'}</details><button class="button secondary" data-go="knowledge">Все подсказки</button></article>`;};
const homeBeforeHelp=V.home;
V.home=()=>homeBeforeHelp().replace('<div class="soft-scout-note">',`<button class="self-help-entry" data-go="knowledge"><span class="self-help-copy"><strong>Самопомощь</strong><em>Короткие подсказки для разных случаев</em></span><span class="self-help-arrow" aria-hidden="true">${I('arrow')}</span></button><div class="soft-scout-note">`);
const messageBeforeHelp=guidedMessage;
guidedMessage=m=>m.type==='help-articles'?`<article class="guided-message"><small class="guided-author">Скаут</small><p>${e(m.text)}</p><div class="scout-help-links">${(m.articleIds||[]).filter(id=>SELF_HELP.some(a=>a.id===id)).map(id=>{const a=helpArticle(id);return `<button data-help-article="${a.id}"><span class="scout-help-icon">${I(a.icon)}</span><span><strong>${e(a.title)}</strong><small>${a.time} мин · ${e(a.tag)}</small></span>${I('arrow')}</button>`;}).join('')}</div><button class="text-button" data-go="knowledge">Все подсказки</button></article>`:messageBeforeHelp(m);
const answerBeforeHelp=answerGuided;
answerGuided=text=>{if(scoutBusy||!text.trim())return answerBeforeHelp(text);const query=/\?|как\b|как |что делать|расскажи|подска|памят|стать|совет|можно ли|почему|куда|чем |какие |нужно ли|можно |зачем|где |самопомощ/i.test(text);if(!query)return answerBeforeHelp(text);const priority=['injured','bite','owner','care','lost','wild','photo','support','cat','first'];const matches=SELF_HELP.filter(a=>a.match.test(text)).sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id));if(!matches.length&&!/памят|стать|совет|самопомощ/i.test(text))return answerBeforeHelp(text);stopGuided();const s=guidedSession();s.active=true;const urgent=matches.some(a=>a.id==='injured'||a.id==='bite');s.mood=urgent||matches.some(a=>a.id==='support')?'worried':'calm';guidedAdd('self',text.trim());guidedAdd('scout',urgent?'Сначала оставайтесь в безопасности и свяжитесь со специалистом. Эта подсказка поможет сориентироваться; чтение не должно задерживать помощь.':'Подобрал короткую подсказку. Можно открыть её и вернуться сюда — ваши ответы сохранены.',{type:'help-articles',articleIds:(matches.length?matches:[helpArticle('first'),helpArticle('photo')]).slice(0,2).map(a=>a.id)});persist();render();};
const composerBeforeHelp=composer;
composer=()=>composerBeforeHelp().replace('<nav class="guided-hot-topics" aria-label="Быстрые темы">','<nav class="guided-hot-topics" aria-label="Быстрые темы"><button data-go="knowledge">'+I('info')+'Самопомощь</button>');
document.addEventListener('input',event=>{if(event.target.id!=='help-search')return;selfHelpQuery=event.target.value;app.querySelector('#help-results').innerHTML=helpResultHTML();});
document.addEventListener('click',event=>{const b=event.target.closest('[data-help-article],[data-help-filter],[data-help-clear],[data-help-ask]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();if(b.dataset.helpArticle){articleId=b.dataset.helpArticle;offsets['article:'+state.current]=0;go('article');}else if(b.dataset.helpFilter){selfHelpFilter=b.dataset.helpFilter;const y=app.querySelector('.scroll-content').scrollTop;render();app.querySelector('.scroll-content').scrollTop=y;}else if(b.hasAttribute('data-help-clear')){selfHelpQuery='';selfHelpFilter='all';render();app.querySelector('#help-search')?.focus({preventScroll:true});}else if(b.dataset.helpAsk){go('scout');answerGuided('Подскажи по статье: '+helpArticle(b.dataset.helpAsk).title);}},true);
const renderBeforeHelp=render;
render=(focus=false)=>{renderBeforeHelp(focus);const s=app.querySelector('.screen:not(.screen-outgoing)');s.classList.toggle('self-help-screen',['knowledge','article'].includes(screen));if(['knowledge','article'].includes(screen)){const title=s.querySelector('.header-center');if(title)title.textContent='Самопомощь';}};
window.podhvat.scout.send=text=>postMessage(text);window.podhvat.render=()=>render();render();

/* ===== src/js/09-tag-rails.js ===== */
// Used topic moves to the end; action identity never depends on position.
const TOPIC_RAILS='.guided-hot-topics,.help-filters,.tab-filter';
function topicKey(button){return button.dataset.guided?'guided:'+button.dataset.guided:button.dataset.helpFilter?'filter:'+button.dataset.helpFilter:button.dataset.action?'action:'+button.dataset.action:button.dataset.go?'go:'+button.dataset.go:null;}
function railKey(rail){return rail.classList.contains('guided-hot-topics')?'scout-topics':screen+':'+(rail.classList.contains('help-filters')?'help-filters':'tabs');}
function orderTopicRail(rail){const order=state.topicRailOrder?.[railKey(rail)]||[];const buttons=[...rail.children].filter(n=>n.tagName==='BUTTON');buttons.sort((a,b)=>{const ai=order.indexOf(topicKey(a)),bi=order.indexOf(topicKey(b));return (ai<0?-1:ai)-(bi<0?-1:bi);});buttons.forEach(n=>rail.append(n));}
// Window capture runs before existing chat handlers which stop propagation.
window.addEventListener('click',event=>{const button=event.target.closest('button'),rail=button?.parentElement;if(!rail?.matches(TOPIC_RAILS)||button.disabled)return;const key=topicKey(button);if(!key)return;state.topicRailOrder??={};const id=railKey(rail);const order=[...rail.children].filter(n=>n.tagName==='BUTTON').map(topicKey).filter(Boolean).filter(n=>n!==key);order.push(key);state.topicRailOrder[id]=order;rail.append(button);rail.scrollLeft=0;persist();},true);
let footerSizeObserver=null;
const renderBeforeTopicRails=render;
render=(focus=false)=>{footerSizeObserver?.disconnect();footerSizeObserver=null;renderBeforeTopicRails(focus);const page=app.querySelector('.screen:not(.screen-outgoing)');page.querySelectorAll(TOPIC_RAILS).forEach(orderTopicRail);const footer=page.querySelector('.guided-footer'),thread=page.querySelector('.guided-thread');if(footer&&thread){const fit=()=>{const nearEnd=thread.scrollHeight-thread.scrollTop-thread.clientHeight<64;page.style.setProperty('--guided-footer-space',footer.getBoundingClientRect().height+'px');if(nearEnd)thread.scrollTop=thread.scrollHeight;};fit();thread.scrollTop=thread.scrollHeight;footerSizeObserver=new ResizeObserver(fit);footerSizeObserver.observe(footer);}};
window.podhvat.render=()=>render();render();

/* ===== src/js/10-home-hub.js ===== */
// The home shelf, scoped helper directories and saved items share existing entities.
SCREEN_REGISTRY.push(['volunteers','Волонтёры','Volunteers','Связь','Поиск, услуги и согласование помощи.'],['organizations','Организации','Organizations','Связь','Службы, поддерживаемые животные и отдельное согласование приёма.']);
const directoryState={volunteers:{query:'',filter:'all'},organizations:{query:'',filter:'all'}};let savedFilter='all';
const helperMeta={v1:{about:'Помощь с временным размещением домашних животных.',icon:'home',terms:'Срок и условия передержки согласуются в диалоге.'},v2:{about:'Помощь с перевозкой домашних животных по согласованному маршруту.',icon:'map',terms:'Стоимость, время и требования к перевозке нужно уточнить.'},o1:{about:'Ветеринарная помощь для домашних животных.',icon:'office',terms:'Время приёма, стоимость и возможность принять животное уточняются отдельно.'},o2:{about:'Профильная помощь домашним, диким и сельскохозяйственным животным.',icon:'shield',terms:'Вид животного и способ помощи согласуются со специалистом.'}};
const activeHelpCase=()=>state.cases.find(c=>c.id===state.current&&c.lifecycle!=='closed');
const suitableHelper=h=>{let c=activeHelpCase();if(!c){const s=guidedSession(),g=s.answers.group;if(g)c={group:/Дикое/.test(g)?'wild':/Сельскохозяйственное/.test(g)?'farm':/Собаку|Кошку/.test(g)?'domestic':'unknown',urgency:s.urgency};}return !c||h.groups.includes(c.group)&&(restricted(c)?h.type==='specialist':c.urgency==='urgent'?['clinic','specialist'].includes(h.type):true);};
const isSaved=(type,id)=>state.favorites.some(f=>f.type===type&&f.objectId===id);
function saveToggle(type,id){const exists=isSaved(type,id);state.favorites=state.favorites.filter(f=>!(f.type===type&&f.objectId===id));if(!exists)state.favorites.push({type,objectId:id});persist();return !exists;}
function helperTile(h){const m=helperMeta[h.id],saved=isSaved(h.kind,h.id),suitable=suitableHelper(h);return `<article class="card directory-card"><div class="directory-top"><span class="directory-mark ${h.kind}">${I(m.icon)}</span><div><h2>${e(h.name)}</h2></div><button class="icon-button directory-save ${saved?'saved':''}" data-hub-save="${h.kind}:${h.id}" aria-label="${saved?'Убрать из избранного':'Добавить в избранное'}" aria-pressed="${saved}">${I('heart')}</button></div><div class="directory-tags"><span class="badge">${e(h.tag)}</span><span class="badge">${h.distance} км</span></div><p>${e(m.about)}</p><button class="button secondary" data-action="helper:${h.id}">Посмотреть карточку ${I('arrow')}</button></article>`;}
function directoryList(route){const st=directoryState[route],kind=route==='volunteers'?'person':'organization',q=st.query.toLowerCase().replace(/ё/g,'е');return helpers.filter(h=>h.kind===kind&&(st.filter!=='suitable'||suitableHelper(h))&&(st.filter!=='saved'||isSaved(h.kind,h.id))&&(!q||[h.name,h.tag,helperMeta[h.id].about].join(' ').toLowerCase().replace(/ё/g,'е').includes(q)));}
function directoryResults(route){const list=directoryList(route);return `${list.length?list.map(helperTile).join(''):`<section class="card directory-empty">${I('search')}<h3>Нет подходящих карточек</h3><p>Измените поиск или фильтр. Скаут поможет выбрать следующий шаг.</p><button class="button secondary" data-hub-clear="${route}">Сбросить фильтры</button><button class="button" data-go="scout">Попросить помощи</button></section>`}`;}
function directoryPage(route){const st=directoryState[route],vol=route==='volunteers';return `<h1>${vol?'Волонтёры':'Организации'}</h1><p class="hub-lead">${vol?'Люди, которые могут подхватить часть заботы.':'Клиники и профильные службы для следующего шага.'}</p><label class="help-search">${I('search')}<input id="directory-search" data-route="${route}" type="search" value="${e(st.query)}" placeholder="${vol?'Имя или вид помощи':'Название или услуга'}" aria-label="Поиск ${vol?'волонтёров':'организаций'}" maxlength="120"></label><nav class="hub-filters" aria-label="Фильтры помощников">${[['all','Все'],['suitable','Для случая'],['saved','Избранные']].map(([id,label])=>`<button data-hub-filter="${id}" class="${st.filter===id?'selected':''}" aria-pressed="${st.filter===id}">${label}</button>`).join('')}</nav>${activeHelpCase()?`<div class="hub-context">${I('shield')}<span>Для случая #${e(activeHelpCase().number)} · ${groupName(activeHelpCase().group)}</span><button data-go="case" aria-label="Открыть текущий случай">${I('arrow')}</button></div>`:''}<div id="directory-results">${directoryResults(route)}</div><button class="button" data-hub-scout="${route}">Подобрать со Скаутом ${I('chat')}</button><div class="hub-crosslinks"><button data-go="${vol?'organizations':'volunteers'}">${vol?'Организации':'Волонтёры'} ${I('arrow')}</button><button data-go="nearby">Посмотреть на карте ${I('map')}</button></div>`;}
V.volunteers=()=>directoryPage('volunteers');V.organizations=()=>directoryPage('organizations');
const helperBeforeHub=V.helper;
V.helper=()=>{const h=helper(),m=helperMeta[h.id],c=activeHelpCase(),saved=isSaved(h.kind,h.id);return `<div class="helper-hero"><span class="directory-mark ${h.kind}">${I(m.icon)}</span><small>${h.kind==='person'?'Волонтёр':'Организация'}</small><h1>${e(h.name)}</h1><span class="badge">${e(h.tag)}</span></div><section class="card"><h3>Чем может помочь</h3><p>${e(m.about)}</p><div class="helper-facts"><div><small>Животные</small><strong>${h.groups.map(groupName).join(', ')}</strong></div><div><small>Ориентир</small><strong>${h.distance} км</strong></div><div><small>Условия</small><strong>${h.price===0?'Без оплаты':'Уточнить стоимость'}</strong></div></div><p class="directory-availability">Готовность и время ответа пока не подтверждены.</p></section><section class="card"><h3>Перед договорённостью</h3><p>${e(m.terms)}</p><p class="caption">Запрос, подтверждение задачи и согласие на контакты — отдельные действия.${h.kind==='organization'?' Приём животного также подтверждается отдельно.':''}</p></section>${c?`<div class="hub-context">${I('grid')}<span>Запрос для случая #${e(c.number)}</span><button data-go="case" aria-label="Открыть случай">${I('arrow')}</button></div>${suitableHelper(h)?'<button class="button" data-action="request-helper">Отправить запрос</button>':'<div class="notice">Для текущего случая нужен подходящий специалист.</div><button class="button" data-go="organizations">Выбрать организацию</button>'}`:'<button class="button" data-go="scout">Описать ситуацию Скауту</button>'}<div class="stack mt"><button class="button secondary" data-hub-save="${h.kind}:${h.id}">${saved?'Убрать из избранного':'В избранное'} ${I('heart')}</button><button class="button secondary" data-hub-helper-ask="${h.id}">Обсудить со Скаутом</button>${c&&c.chats[h.id]?'<button class="button secondary" data-action="open-chat:'+h.id+'">Диалог по случаю</button>':''}${h.kind==='organization'&&c&&c.tasks.some(t=>t.helperId===h.id)?button(c.intakeConfirmed?'Приём подтверждён локально':'Имитировать подтверждение приёма','confirm-intake','secondary'):''}<button class="button secondary" data-hub-save="service:${h.id}">${isSaved('service',h.id)?'Убрать услугу из избранного':'Сохранить услугу'}</button><button class="text-button" data-go="${h.kind==='person'?'volunteers':'organizations'}">Все ${h.kind==='person'?'волонтёры':'организации'}</button></div>`;};
function savedItem(f){const h=helpers.find(h=>h.id===f.objectId);if(h)return `<section class="card saved-card"><div class="split"><span><small>${f.type==='service'?'Услуга':h.kind==='person'?'Волонтёр':'Организация'}</small><h3>${e(f.type==='service'?h.tag:h.name)}</h3></span><button class="icon-button" data-hub-save="${f.type}:${f.objectId}" aria-label="Удалить ${e(h.name)} из избранного">${I('close')}</button></div><p>${e(helperMeta[h.id].about)}</p><button class="button secondary" data-action="helper:${h.id}">Открыть карточку</button></section>`;if(f.type==='article'){const a=SELF_HELP.find(a=>a.id===f.objectId);if(!a)return '';return `<section class="card saved-card"><div class="split"><h3>${e(a.title)}</h3><button class="icon-button" data-hub-save="article:${a.id}" aria-label="Убрать статью из избранного">${I('close')}</button></div><p class="caption">Подсказка · ${a.time} мин</p><button class="button secondary" data-help-article="${a.id}">Читать подсказку</button></section>`;}const c=state.cases.find(c=>c.id===f.objectId),near=f.objectId==='nearby1';return `<section class="card saved-card"><div class="split"><h3>${e(c?name(c):near?'Кошка во дворе':'Карточка недоступна')}</h3><button class="icon-button" data-hub-save="${f.type}:${f.objectId}" aria-label="Удалить животное из избранного">${I('close')}</button></div><p class="caption">${e(c?c.publicPlace:near?'Случай рядом':'Случай удалён из локальной сессии')}</p>${c?`<button class="button secondary" data-hub-case="${c.id}">Открыть ${c.lifecycle==='closed'?'историю':'случай'}</button>`:near?'<button class="button secondary" data-go="nearby-case">Открыть случай рядом</button>':''}</section>`;}
V.favorites=()=>{const list=state.favorites.filter(f=>savedFilter==='all'||f.type===savedFilter);return `<h1>Избранное</h1><p class="hub-lead">Полезные контакты и материалы — под рукой.</p><nav class="hub-filters" aria-label="Группы избранного">${[['all','Все'],['person','Волонтёры'],['organization','Организации'],['service','Услуги'],['animal','Животные'],['article','Статьи']].map(([id,label])=>`<button data-hub-saved-filter="${id}" class="${savedFilter===id?'selected':''}" aria-pressed="${savedFilter===id}">${label}</button>`).join('')}</nav>${list.length?`<small class="directory-count">Сохранено: ${list.length}</small>${list.map(savedItem).join('')}`:`<section class="card saved-empty"><span class="directory-mark">${I('heart')}</span><h2>${state.favorites.length?'В этой группе пока пусто':'Сохраните то, что пригодится'}</h2><p>Нажмите сердце в карточке помощника или сохраните полезную статью.</p><button class="button" data-go="volunteers">Посмотреть волонтёров</button><button class="button secondary" data-go="organizations">Выбрать организацию</button><button class="button secondary" data-go="knowledge">Подсказки для разных случаев</button></section>`}<button class="button secondary" data-hub-scout="favorites">Обсудить со Скаутом ${I('chat')}</button>`;};
const articleBeforeHub=V.article;V.article=()=>articleBeforeHub().replace('<section class="help-related">',`<button class="button secondary" data-hub-save="article:${articleId}">${isSaved('article',articleId)?'Убрать статью из избранного':'Сохранить статью'} ${I('heart')}</button><section class="help-related">`);
const answerBeforeHub=answerGuided;
answerGuided=text=>{if(!/волонт|организац|клиник|зоотакси|приют|избран/i.test(text)||!/как|помо|най|нуж|покаж|где|ищ|хочу|есть|\?/i.test(text))return answerBeforeHub(text);if(scoutBusy)return;stopGuided();guidedSession().active=true;guidedAdd('self',text.trim());const saved=/избран/i.test(text),vol=/волонт|зоотакси/i.test(text),route=saved?'favorites':vol?'volunteers':'organizations';let list=helpers.filter(h=>saved?isSaved(h.kind,h.id)||isSaved('service',h.id):h.kind===(vol?'person':'organization'));list=list.filter(suitableHelper);guidedAdd('scout',saved?'Ваше избранное помогает вернуться к нужным контактам. Готовность каждого помощника нужно подтвердить отдельно.':'Подбор зависит от вида животного и ситуации. Ниже — подходящие карточки; запрос не означает согласие помочь или принять животное.',{type:'hub-links',helperIds:list.slice(0,2).map(h=>h.id),route});persist();render();};
const messageBeforeHub=guidedMessage;guidedMessage=m=>m.type==='hub-links'?`<article class="guided-message"><small class="guided-author">Скаут</small><p>${e(m.text)}</p><div class="scout-help-links">${(m.helperIds||[]).map(id=>helpers.find(h=>h.id===id)).filter(Boolean).map(h=>`<button data-action="helper:${h.id}"><span class="scout-help-icon">${I(h.kind==='person'?'user':'office')}</span><span><strong>${e(h.name)}</strong><small>${e(h.tag)} · готовность уточняется</small></span>${I('arrow')}</button>`).join('')}</div><button class="text-button" data-go="${m.route}">Открыть ${m.route==='favorites'?'избранное':m.route==='volunteers'?'волонтёров':'организации'}</button>${!(m.helperIds||[]).length?'<p class="caption">Пока нет подходящих карточек. Можно уточнить ситуацию и выбрать профильную службу.</p>':''}</article>`:messageBeforeHub(m);
document.addEventListener('input',ev=>{if(ev.target.id!=='directory-search')return;directoryState[ev.target.dataset.route].query=ev.target.value;app.querySelector('#directory-results').innerHTML=directoryResults(ev.target.dataset.route);});
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-hub-save],[data-hub-filter],[data-hub-clear],[data-hub-saved-filter],[data-hub-scout],[data-hub-helper-ask],[data-hub-case]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();if(b.dataset.hubSave){const [type,id]=b.dataset.hubSave.split(':');const added=saveToggle(type,id);render();toast(added?'Сохранено в избранном':'Убрано из избранного');}else if(b.dataset.hubFilter){directoryState[screen].filter=b.dataset.hubFilter;render();}else if(b.dataset.hubClear){directoryState[b.dataset.hubClear]={query:'',filter:'all'};render();}else if(b.dataset.hubSavedFilter){savedFilter=b.dataset.hubSavedFilter;render();}else if(b.dataset.hubCase){state.current=b.dataset.hubCase;persist();go(current().lifecycle==='closed'?'history-case':'case');}else if(b.dataset.hubHelperAsk){const h=helpers.find(h=>h.id===b.dataset.hubHelperAsk);go('scout');guidedSession().active=true;guidedAdd('self','Хочу обсудить: '+h.name);guidedAdd('scout','Обсудим условия и соответствие вашему случаю. Готовность ещё не подтверждена.',{type:'hub-links',helperIds:[h.id],route:h.kind==='person'?'volunteers':'organizations'});persist();render();}else if(b.dataset.hubScout){const route=b.dataset.hubScout;go('scout');answerGuided(route==='favorites'?'Покажи моё избранное':route==='volunteers'?'Помоги найти волонтёра':'Помоги выбрать организацию');}},true);
let hubSizeObserver=null;const renderBeforeHub=render;
render=(focus=false)=>{hubSizeObserver?.disconnect();hubSizeObserver=null;renderBeforeHub(focus);const page=app.querySelector('.screen:not(.screen-outgoing)');if(screen==='home'){const shelf=document.createElement('nav');shelf.className='home-shortcuts';shelf.setAttribute('aria-label','Быстрые разделы');shelf.innerHTML=[['favorites','Избранное'],['volunteers','Волонтёры'],['organizations','Организации']].map(([route,label])=>`<button data-go="${route}">${label}</button>`).join('');page.append(shelf);const dock=page.querySelector('.dock');const fit=()=>{const h=page.getBoundingClientRect(),d=dock.getBoundingClientRect();shelf.style.bottom=h.bottom-d.top+6+'px';page.style.setProperty('--home-bottom-space',h.bottom-d.top+6+shelf.offsetHeight+24+'px');};fit();hubSizeObserver=new ResizeObserver(fit);hubSizeObserver.observe(dock);if(!state.prefs.reduceMotion&&!matchMedia('(prefers-reduced-motion:reduce)').matches)shelf.animate([{opacity:0,transform:'translateY(6px) scaleY(.75)'},{opacity:1,transform:'none'}],{duration:300,easing:'cubic-bezier(.22,.7,.2,1)'});}else{const outgoing=app.querySelector('.screen-outgoing .home-shortcuts');if(outgoing&&!state.prefs.reduceMotion&&!matchMedia('(prefers-reduced-motion:reduce)').matches)outgoing.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px) scaleY(.2)'}],{duration:200,fill:'forwards',easing:'ease-out'});}page.classList.toggle('hub-screen',['favorites','volunteers','organizations','helper'].includes(screen));};
const tabsBeforeHub=tabFor;tabFor=id=>['volunteers','organizations'].includes(id)?'chats':tabsBeforeHub(id);
const helpersBeforeHub=V.helpers;V.helpers=()=>`<div class="action-row hub-directory-links"><button class="button secondary" data-go="volunteers">Волонтёры</button><button class="button secondary" data-go="organizations">Организации</button></div>`+helpersBeforeHub();
const profileBeforeHub=V.profile;V.profile=()=>profileBeforeHub()+`<div class="stack mt">${row('Волонтёры','volunteers','user')}${row('Организации','organizations','office')}</div>`;
const hubFilterKey=b=>b.dataset.hubFilter||b.dataset.hubSavedFilter;
window.addEventListener('click',ev=>{const b=ev.target.closest('.hub-filters button');if(!b)return;const rail=b.parentElement,key=hubFilterKey(b);state.topicRailOrder??={};state.topicRailOrder[screen+':hub']=[...rail.children].map(hubFilterKey).filter(k=>k!==key).concat(key);rail.append(b);rail.scrollLeft=0;persist();},true);
const renderWithHub=render;render=(focus=false)=>{renderWithHub(focus);app.querySelectorAll('.screen:not(.screen-outgoing) .hub-filters').forEach(rail=>{const order=state.topicRailOrder?.[screen+':hub']||[];[...rail.children].sort((a,b)=>order.indexOf(hubFilterKey(a))-order.indexOf(hubFilterKey(b))).forEach(b=>rail.append(b));});};
window.podhvat.render=()=>render();window.podhvat.scout.send=text=>postMessage(text);render();

/* ===== src/js/11-panorama.js ===== */
// Generated local environments. No location capture, real scan or publication.
const PANORAMA_SCENES=[
 {id:'park',caseId:'nearby-dog',number:'0319',title:'Собака в парке',place:'Городской парк',group:'domestic',species:'dog',features:'Рыжая шерсть, светлая грудь',image:'assets/panoramas/park.jpg'},
 {id:'courtyard',caseId:'nearby1',number:'0318',title:'Кошка во дворе',place:'Зелёный двор',group:'domestic',species:'cat',features:'Серая полосатая шерсть',image:'assets/panoramas/courtyard.jpg'},
 {id:'meadow',caseId:'nearby-horse',number:'0320',title:'Лошадь на лугу',place:'Луг у деревни',group:'farm',species:'horse',features:'Коричневая шерсть',image:'assets/panoramas/meadow.jpg'}
];
let panoramaSceneId='park',panoramaViewer=null;
const panoramaScene=()=>PANORAMA_SCENES.find(s=>s.id===panoramaSceneId)||PANORAMA_SCENES[0];
function selectPanorama(id){panoramaSceneId=PANORAMA_SCENES.some(s=>s.id===id)?id:'park';const s=panoramaScene();Object.assign(nearbyCase,{id:s.caseId,number:s.number,name:s.title,nameEN:s.title,group:s.group,species:s.species,publicPlace:s.place,features:s.features,featuresEN:s.features,photo:s.image,synthetic:true});}
function scanPreview(s){return `<span class="scene-scan" aria-hidden="true"><svg viewBox="0 0 80 86" fill="none"><path d="M-8 61 40 32 88 61 40 91Z" fill="#adc2cc40" stroke="#adc2cc"/><path d="m0 65 48-29m-8 42 48-29M8 42l48 29M24 32l48 29" stroke="#adc2cc70"/><path d="M5 43V23l13-7 13 7v20l-13 8Zm0-20 13 8 13-8m-13 8v20M53 49V30l10-6 10 6v19l-10 6Zm0-19 10 6 10-6m-10 6v19" fill="#adc2cc30" stroke="#dbe5e9a0"/><ellipse cx="40" cy="65" rx="15" ry="7" stroke="#dbf95b" stroke-dasharray="2 3"/></svg><span class="scene-animal" style="background-image:url('${s.image}');background-position:50% ${s.id==='park'?71:s.id==='courtyard'?66:57}%"></span></span>`;}
function sceneCard(s){return `<button class="scene-card" data-panorama-card="${s.id}" aria-label="Открыть карточку: ${e(s.title)}">${scanPreview(s)}<span class="scene-copy"><strong>${e(s.title)}</strong><small>${e(s.place)}<br>Окружение 3D</small></span><span class="scene-arrow">${I('arrow')}</span></button>`;}
V.panorama=()=>{const s=panoramaScene();return `<div class="panorama-view"><canvas class="panorama-canvas" tabindex="0" aria-label="Панорама 360 градусов. Вращайте перетаскиванием или клавишами стрелок."></canvas></div><div class="panorama-top"><button class="icon-button" data-go="nearby" aria-label="Назад на карту">${I('back')}</button><strong>Сцена 360°</strong><button class="icon-button" data-panorama-reset aria-label="Показать животное">${I('target')}</button></div>${sceneCard(s)}<div class="panorama-bottom"><p class="panorama-help" role="status">Проведите по экрану, чтобы осмотреться</p><div class="panorama-controls"><button class="icon-button" data-panorama-turn="left" aria-label="Повернуть влево">${I('arrow')}</button><button class="icon-button" data-panorama-reset aria-label="Вернуться к животному">${I('target')}</button><button class="icon-button" data-panorama-turn="right" aria-label="Повернуть вправо">${I('arrow')}</button></div><small class="panorama-credit">Окружение 360°</small></div>`;};
SCREEN_REGISTRY.push(['panorama','Сцена 360°','360° scene','Рядом','Панорама с животным и переходом к карточке.']);
const nearbyBeforePanorama=V.nearby;
V.nearby=()=>{let index=0;let html=nearbyBeforePanorama();if(!mapFeed){html=html.replace(/data-review="pin:(?:animal|helper)" aria-label="[^"]*"/g,original=>index<3?`data-panorama-open="${PANORAMA_SCENES[index].id}" aria-label="${PANORAMA_SCENES[index++].title} — открыть сцену 360 градусов"`:original);if(selectedPin==='animal'){const s=panoramaScene();html=html.replace(/<div class="map-selected">[\s\S]*$/,`<div class="map-selected"><div class="split"><img class="mini-photo" src="${s.image}" alt="${e(s.title)}"><div><h3>${e(s.title)}</h3><small>${e(s.place)}</small></div>${I('arrow')}</div><button class="button" data-panorama-open="${s.id}">Осмотреть сцену 360°</button></div>`);}}return html;};
V['nearby-case']=()=>{selectPanorama(panoramaSceneId);const s=panoramaScene();return `<h1>#${s.number} · ${e(s.title)}</h1><section class="card"><img class="scene-photo" src="${s.image}" alt="${e(s.title)}, сгенерированная сцена"><div class="directory-tags"><span class="badge">${s.group==='farm'?'Профильный специалист':'Нужна помощь'}</span><span class="badge">${e(s.place)}</span></div><p>${e(s.features)}. Примерная зона наблюдения, без точного адреса.</p><button class="button secondary" data-panorama-open="${s.id}">Посмотреть сцену 360° ${I('arrow')}</button></section>${link('Предложить помощь','offer','')}${button('Сохранить животное','favorite:animal:'+s.caseId,'secondary')}`;};
const savedItemBeforePanorama=savedItem;
savedItem=f=>{const s=PANORAMA_SCENES.find(s=>s.caseId===f.objectId);if(f.type!=='animal'||!s)return savedItemBeforePanorama(f);return `<section class="card saved-card"><div class="split"><h3>${e(s.title)}</h3><button class="icon-button" data-hub-save="animal:${s.caseId}" aria-label="Удалить животное из избранного">${I('close')}</button></div><p class="caption">${e(s.place)}</p><button class="button secondary" data-panorama-card="${s.id}">Открыть карточку</button></section>`;};
const tasksBeforePanorama=V.tasks;
V.tasks=()=>tasksBeforePanorama().replace(/<div class="card"><h3>(?:Мои предложения рядом|My nearby offers)<\/h3>[\s\S]*?<\/div>/,state.nearbyTasks.map(task=>{const s=PANORAMA_SCENES.find(s=>s.caseId===task.caseId);return `<section class="card"><h3>${e(s?s.title:'Случай рядом')}</h3><p>Предложено · ждём ответа${s?' · #'+s.number:''}</p><p class="caption">${e(task.deadline||'Срок уточняется')}</p>${s?`<button class="button secondary" data-panorama-card="${s.id}">Открыть карточку</button>`:''}</section>`;}).join(''));
function createPanorama(canvas,s){
const gl=canvas.getContext('webgl',{alpha:false,preserveDrawingBuffer:true});
const initialPitch=s.id==='meadow'?-.05:-.4;let yaw=0,pitch=initialPitch,fov=1.6,ready=false,disposed=false,drag=null;
const status=()=>app.querySelector('.panorama-help');
if(!gl){canvas.style.background=`url('${s.image}') 50% 65% / auto 100%`;status().textContent='Панорама недоступна в этом браузере. Карточка доступна сверху.';return {dispose(){},turn(){},reset(){}};}
const compile=(type,src)=>{const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
const program=gl.createProgram(),vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 v; void main(){v=p;gl_Position=vec4(p,0.,1.);}'),fragment=compile(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 v;uniform sampler2D image;uniform vec3 camera;uniform float aspect;void main(){float scale=tan(camera.z*.5);vec3 d=normalize(vec3(v.x*aspect*scale,v.y*scale,-1.));float cp=cos(camera.y),sp=sin(camera.y);d=vec3(d.x,cp*d.y-sp*d.z,sp*d.y+cp*d.z);float cy=cos(camera.x),sy=sin(camera.x);d=vec3(cy*d.x-sy*d.z,d.y,sy*d.x+cy*d.z);float u=fract(atan(d.x,-d.z)/6.2831853+.5);float y=.5-asin(clamp(d.y,-1.,1.))/3.14159265;vec4 c=texture2D(image,vec2(u,y));float edge=min(u,1.-u);if(edge<.02)c=mix(c,texture2D(image,vec2(1.-u,y)),.5*(1.-smoothstep(0.,.02,edge)));gl_FragColor=c;}`);
gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
const camera=gl.getUniformLocation(program,'camera'),aspect=gl.getUniformLocation(program,'aspect');
function draw(){if(!ready||disposed)return;const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform3f(camera,yaw,pitch,fov);gl.uniform1f(aspect,r.width/r.height);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.yaw=String(yaw);canvas.dataset.ready='true';}
const img=new Image();img.onload=()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);ready=true;draw();};img.onerror=()=>{if(status())status().textContent='Не удалось загрузить сцену. Откройте карточку сверху.';};img.src=s.image;
canvas.addEventListener('pointerdown',ev=>{drag={x:ev.clientX,y:ev.clientY};canvas.setPointerCapture(ev.pointerId);canvas.focus({preventScroll:true});});canvas.addEventListener('pointermove',ev=>{if(!drag)return;yaw-=(ev.clientX-drag.x)*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+(ev.clientY-drag.y)*.005));drag={x:ev.clientX,y:ev.clientY};draw();});const release=()=>drag=null;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
function turn(direction){yaw+=direction*.4;draw();}function reset(){yaw=0;pitch=initialPitch;draw();}
canvas.addEventListener('keydown',ev=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(ev.key)){ev.preventDefault();if(ev.key==='Home')reset();else if(ev.key==='ArrowLeft'||ev.key==='ArrowRight')turn(ev.key==='ArrowLeft'?-1:1);else{pitch=Math.max(-1.2,Math.min(1.2,pitch+(ev.key==='ArrowUp'?.1:-.1)));draw();}}});
const resize=new ResizeObserver(draw);resize.observe(canvas);
return {turn,reset,dispose(){disposed=true;resize.disconnect();gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
const renderBeforePanorama=render;
render=(focus=false)=>{const oldCanvas=app.querySelector('.screen:not(.screen-outgoing) .panorama-canvas');if(oldCanvas?.dataset.ready){const snapshot=new Image();snapshot.src=oldCanvas.toDataURL();snapshot.className='panorama-canvas';snapshot.alt='';oldCanvas.replaceWith(snapshot);}panoramaViewer?.dispose();panoramaViewer=null;renderBeforePanorama(focus);const page=app.querySelector('.screen:not(.screen-outgoing)');if(screen==='panorama'){page.classList.add('panorama-screen');panoramaViewer=createPanorama(page.querySelector('canvas'),panoramaScene());}};
document.addEventListener('click',ev=>{const control=ev.target.closest('[data-panorama-open],[data-panorama-card],[data-panorama-turn],[data-panorama-reset]');if(!control){if(ev.target.closest('[data-go="nearby-case"]'))selectPanorama('courtyard');return;}ev.preventDefault();ev.stopImmediatePropagation();if(control.dataset.panoramaOpen){selectedPin='animal';selectPanorama(control.dataset.panoramaOpen);go('panorama');}else if(control.dataset.panoramaCard){selectPanorama(control.dataset.panoramaCard);go('nearby-case');}else if(control.dataset.panoramaTurn)panoramaViewer?.turn(control.dataset.panoramaTurn==='left'?-1:1);else panoramaViewer?.reset();},true);
document.addEventListener('submit',ev=>{if(ev.target.id!=='offer-form')return;ev.preventDefault();ev.stopImmediatePropagation();state.nearbyTasks.push({caseId:panoramaScene().caseId,type:document.getElementById('offer-type').value,deadline:document.getElementById('offer-time').value.trim(),status:'offered'});persist();go('tasks');toast('Предложение сохранено локально.');},true);
window.podhvat.panorama={scenes:PANORAMA_SCENES,open(id){selectPanorama(id);go('panorama');}};
render();

/* ===== src/js/12-profile-settings-v9.js ===== */
/* Personal identity stays in Profile; app preferences and tools live in Settings. */
(()=>{
const corner=(id,icon,label)=>`<button class="icon-button account-corner" data-go="${id}" aria-label="${label}">${I(icon)}</button>`;
const tile=(id,icon,title,detail,tone='')=>`<button class="card account-tile ${tone}" data-go="${id}"><span class="account-tile-icon">${I(icon)}</span><strong>${title}</strong><span class="account-tile-detail">${detail}</span><span class="account-tile-arrow" aria-hidden="true">${I('arrow')}</span></button>`;
// The general helper list must retain the same accepted catalog card pattern.
helperCard=h=>helperTile(h);
V.profile=()=>{
const p=state.profile,docs=[p.chip,p.vaccines,p.passport].filter(v=>String(v||'').trim()).length,awards=Object.keys(state.awards).length;
return `<div class="account-heading"><h1>${T('Профиль','Profile')}</h1><p>${T('Всё, что относится к вам.','All about you.')}</p></div>
<section class="card account-identity"><div class="account-person"><span class="account-avatar" aria-hidden="true">${e((p.name||T('Вы','You')).trim().slice(0,2).toUpperCase())}</span><div><h2>${e(p.name||T('Ваше имя','Your name'))}</h2><span class="account-label">${T('Личные данные','Personal information')}</span></div></div>${corner('edit-profile','edit',T('Редактировать профиль','Edit profile'))}<p class="account-private">${I('shield')}${p.contact?T('Контакт сохранён приватно','Contact saved privately'):T('Добавьте контакт в личные данные','Add a contact to your personal details')}</p></section>
<button class="card account-pet" data-go="pet"><div class="account-pet-copy"><span class="account-label">${T('Мой питомец','My pet')}</span><h2>${e(p.petName||T('Добавить имя','Add a name'))}</h2><p>${T('Приметы и забота — в одном месте','Features and care in one place')}</p></div><img src="assets/cat.png" alt="${T('Мой питомец','My pet')}"><span class="account-pet-arrow" aria-hidden="true">${I('arrow')}</span></button>
<div class="account-grid personal-tiles">${tile('documents','grid',T('Документы','Documents'),docs?T(`Заполнено ${docs} из 3`,`${docs} of 3 completed`):T('Чип, прививки и паспорт','Chip, vaccines and passport'))}${tile('awards','check',T('Достижения','Achievements'),T(`Уровень ${1+awards} · наград ${awards}`,`Level ${1+awards} · ${awards} awards`),'account-accent')}</div>`;
};
V.settings=()=>`<div class="account-heading"><h1>${T('Настройки','Settings')}</h1><p>${T('Настройте Подхват под себя.','Make Podhvat work for you.')}</p></div>
<div class="account-grid settings-appearance"><button class="card account-tile account-theme" data-action="theme"><span class="account-tile-icon">${I('sun')}</span><strong>${T('Тема','Theme')}</strong><span class="theme-preview" aria-hidden="true"><i></i><i></i><i></i></span><span class="account-tile-detail">${theme==='light'?T('Светлая → тёмная','Light → dark'):T('Тёмная → светлая','Dark → light')}</span></button><button class="card account-tile" data-action="language"><span class="account-language" aria-hidden="true">${lang==='ru'?'Аа':'Aa'}</span><strong>${T('Язык','Language')}</strong><span class="account-tile-detail">${lang==='ru'?'Русский → English':'English → Русский'}</span><span class="account-tile-arrow" aria-hidden="true">${I('arrow')}</span></button></div>
<section class="card account-access"><h3>${T('Комфорт интерфейса','Interface comfort')}</h3><div class="settings-toggles">${[['reduceMotion',T('Меньше движения','Less motion')],['reduceTransparency',T('Меньше прозрачности','Less transparency')],['increaseContrast',T('Больше контраста','More contrast')]].map(([id,label])=>`<label class="preference-row"><span>${label}</span><input type="checkbox" role="switch" data-pref="${id}" ${state.prefs[id]?'checked':''}></label>`).join('')}</div></section>
<div class="account-heading account-section-heading"><h2>${T('Разделы приложения','App sections')}</h2></div><div class="account-grid settings-tools">${[['favorites','heart',T('Избранное','Saved items'),T('Сохранённое','Your saved items')],['history','clock',T('История случаев','Case history'),T('Завершённая помощь','Completed help')],['chats','chat',T('Диалоги','Conversations'),T('Связь по случаям','Case conversations')],['knowledge','info',T('Самопомощь','Self-help'),T('Короткие подсказки','Quick guides')],['volunteers','user',T('Волонтёры','Volunteers'),T('Люди рядом','People nearby')],['organizations','office',T('Организации','Organizations'),T('Профильная помощь','Specialist help')]].map(a=>tile(...a)).join('')}</div>
<section class="card account-privacy"><div class="account-privacy-top"><span class="account-tile-icon">${I('shield')}</span><h3>${T('Приватность','Privacy')}</h3></div><p>${T('Контакты скрыты. Вы сами решаете, с кем ими поделиться в диалоге.','Contacts are hidden. You decide who to share them with in a conversation.')}</p>${link(T('Согласие на контакты','Contact consent'),'consent','secondary')}</section>
<section class="card account-data"><h3>${T('Данные на устройстве','Data on this device')}</h3><p>${T('Сброс удалит локальные случаи, профиль и сохранённые элементы на этом устройстве.','Reset removes cases, profile and saved items on this device.')}</p>${button(T('Сбросить данные','Reset data'),'reset','danger')}</section>`;
for(const entry of SCREEN_REGISTRY){if(entry[0]==='profile')entry[4]='Личные данные, свой питомец, документы и достижения.';if(entry[0]==='settings')entry[4]='Оформление, доступность, приватность и разделы приложения.';if(['history','history-case','update','favorites'].includes(entry[0]))entry[3]='Настройки';}
render();
})();

/* ===== src/js/13-profile-details.js ===== */
(()=>{
const networks=[['vk','VK','vk.com'],['telegram','Telegram','t.me'],['instagram','Instagram','instagram.com'],['whatsapp','WhatsApp','wa.me']];
let draft=null,geoRequest=0,avatarRequest=0;
const avatar=p=>p.avatar?`<img src="${e(p.avatar)}" alt="${T('Ваша аватарка','Your avatar')}">`:e((p.name||T('Вы','You')).trim().slice(0,2).toUpperCase());
const priorProfile=V.profile;
V.profile=()=>{let html=priorProfile(),p=state.profile;html=html.replace(/(<span class="account-avatar"[^>]*>)[\s\S]*?(<\/span>)/,`$1${avatar(p)}$2`);const details=[p.email?T('Почта добавлена','Email added'):'',p.district?e(p.district):p.location?T('Геолокация для поиска','Location for search'):'',Object.values(p.socials||{}).filter(Boolean).length?T('Социальные профили добавлены','Social profiles added'):''].filter(Boolean);return html.replace('</section>',`${details.length?`<p class="profile-summary">${details.join(' · ')}</p>`:''}</section>`);};
V['edit-profile']=()=>{draft={...state.profile,socials:{...(state.profile.socials||{})},location:state.profile.location?{...state.profile.location}:null};return `<h1>${T('Ваш профиль','Your profile')}</h1><form id="profile-form" class="profile-details-form">
<section class="card profile-avatar-editor"><span class="account-avatar" id="profile-avatar-preview">${avatar(draft)}</span><div class="profile-avatar-actions"><button class="button secondary" type="button" data-profile="avatar">${I('photo')}${T('Сменить аватарку','Change avatar')}</button><button class="button secondary" type="button" data-profile="remove-avatar">${T('Убрать фото','Remove photo')}</button></div><input id="profile-avatar-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><p class="caption" id="profile-avatar-status" role="status">${T('JPG, PNG или WebP · до 5 МБ','JPG, PNG or WebP · up to 5 MB')}</p></section>
<section class="card profile-fields"><h3>${T('Личные данные','Personal details')}</h3><label class="field">${T('Имя','Name')}<input id="profile-name" value="${e(draft.name)}" required maxlength="60" autocomplete="name"></label><label class="field">${T('Почта','Email')}<input id="profile-email" type="email" value="${e(draft.email||'')}" maxlength="160" autocomplete="email" placeholder="name@example.com"></label><label class="field">${T('Контакт — приватно','Contact — private')}<input id="profile-contact" value="${e(draft.contact)}" maxlength="120"></label><p class="caption">${T('Почта и контакты не показываются в публичных карточках.','Email and contacts stay off public cards.')}</p></section>
<section class="card profile-fields"><h3>${T('Социальные профили','Social profiles')}</h3><p class="caption">${T('Добавьте ссылку на свой профиль.','Add your profile link.')}</p><div class="profile-socials">${networks.map(([key,title,host])=>`<label class="field">${title}<input type="url" id="profile-social-${key}" value="${e(draft.socials[key]||'')}" placeholder="https://${host}/…" data-network="${key}" aria-describedby="social-error-${key}"><small id="social-error-${key}" class="error" role="alert"></small></label>`).join('')}</div></section>
<section class="card profile-fields"><h3>${T('Район для поиска','Search area')}</h3><label class="field">${T('Район проживания','Your district')}<input id="profile-district" value="${e(draft.district||'')}" maxlength="120" placeholder="${T('Например, Центральный район','For example, Central district')}" autocomplete="address-level3"></label><p class="caption">${T('Можно указать район или использовать текущее местоположение. Точная точка остаётся приватной.','Enter a district or use your current location. Your precise position stays private.')}</p><div class="stack"><button type="button" class="button secondary" data-profile="location">${I('target')}${T('Использовать геолокацию','Use current location')}</button><button type="button" class="button secondary" data-profile="remove-location">${T('Отключить геолокацию','Remove location')}</button></div><p id="profile-location-status" class="caption" role="status">${draft.location?T('Местоположение сохранено. Можно обновить.','Location saved. You can update it.'):T('Геолокация не подключена','Location is off')}</p></section>
<p id="profile-save-error" class="error" role="alert"></p><button class="button" type="submit">${T('Сохранить','Save')}</button></form>${link(T('Отмена','Cancel'),'profile','secondary')}`;};
function status(id,text){const node=document.getElementById(id);if(node)node.textContent=text;}
document.addEventListener('click',event=>{const control=event.target.closest('[data-profile]');if(!control||screen!=='edit-profile'||!draft)return;const action=control.dataset.profile;
if(action==='avatar')document.getElementById('profile-avatar-file').click();
if(action==='remove-avatar'){avatarRequest++;document.querySelector('#profile-form [type=submit]').disabled=false;draft.avatar='';document.getElementById('profile-avatar-preview').textContent=(document.getElementById('profile-name').value||T('Вы','You')).slice(0,2).toUpperCase();status('profile-avatar-status',T('Фото будет удалено после сохранения','Photo will be removed when you save'));}
if(action==='remove-location'){geoRequest++;draft.location=null;document.querySelector('[data-profile="location"]').disabled=false;status('profile-location-status',T('Геолокация отключена. Изменение применится после сохранения.','Location removed. Save to apply.'));}
if(action==='location'){if(!navigator.geolocation){status('profile-location-status',T('Геолокация недоступна. Укажите район вручную.','Location is unavailable. Enter your district.'));return;}const request=++geoRequest;const activeDraft=draft;control.disabled=true;status('profile-location-status',T('Определяем местоположение…','Getting your location…'));navigator.geolocation.getCurrentPosition(pos=>{if(request!==geoRequest||draft!==activeDraft||screen!=='edit-profile')return;document.getElementById('profile-district').value='';draft.location={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,updatedAt:new Date().toISOString()};control.disabled=false;status('profile-location-status',T('Местоположение получено. Нажмите «Сохранить».','Location received. Press Save.'));},()=>{if(request!==geoRequest||draft!==activeDraft||screen!=='edit-profile')return;control.disabled=false;status('profile-location-status',T('Нет доступа к геолокации. Можно указать район вручную.','Location access unavailable. Enter your district manually.'));},{enableHighAccuracy:false,timeout:10000,maximumAge:0});}
});
document.addEventListener('input',event=>{if(event.target.id==='profile-name')event.target.setCustomValidity('');if(event.target.id==='profile-district'&&draft&&event.target.value.trim()){geoRequest++;draft.location=null;document.querySelector('[data-profile="location"]').disabled=false;status('profile-location-status',T('Для поиска выбран район','Search uses your district'));}});
document.addEventListener('change',async event=>{if(event.target.id!=='profile-avatar-file'||!draft)return;const file=event.target.files[0],activeDraft=draft,request=++avatarRequest;if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){status('profile-avatar-status',T('Выберите JPG, PNG или WebP до 5 МБ','Choose a JPG, PNG or WebP up to 5 MB'));return;}document.querySelector('#profile-form [type=submit]').disabled=true;try{const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}),canvas=document.createElement('canvas');canvas.width=canvas.height=192;const size=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,192,192);bitmap.close();if(request!==avatarRequest||draft!==activeDraft||screen!=='edit-profile')return;draft.avatar=canvas.toDataURL('image/jpeg',.85);document.getElementById('profile-avatar-preview').innerHTML=avatar(draft);status('profile-avatar-status',T('Фото готово. Нажмите «Сохранить».','Photo ready. Press Save.'));}catch{if(request===avatarRequest)status('profile-avatar-status',T('Не удалось прочитать изображение','Could not read this image'));}finally{if(request===avatarRequest&&draft===activeDraft&&screen==='edit-profile')document.querySelector('#profile-form [type=submit]').disabled=false;}});
document.addEventListener('submit',event=>{if(event.target.id!=='profile-form'||!draft)return;event.preventDefault();event.stopImmediatePropagation();const nameInput=document.getElementById('profile-name');if(!nameInput.value.trim()){nameInput.setCustomValidity(T('Укажите имя','Enter a name'));nameInput.reportValidity();return;}let valid=true;const socials={};for(const[key,,host]of networks){const input=document.getElementById('profile-social-'+key),value=input.value.trim();let okay=true;if(value){try{const url=new URL(value);okay=url.protocol==='https:'&&[host,'www.'+host,...(key==='telegram'?['telegram.me']:key==='whatsapp'?['api.whatsapp.com']:[])].includes(url.hostname.toLowerCase())&&!url.username&&!url.password&&url.pathname!=='/';}catch{okay=false;}}status('social-error-'+key,okay?'':T('Укажите HTTPS-ссылку на профиль в этой соцсети','Enter an HTTPS profile link for this network'));valid=valid&&okay;socials[key]=value;}if(!valid){document.querySelector('.profile-socials .field:has(.error:not(:empty)) input')?.focus();return;}Object.assign(state.profile,{name:document.getElementById('profile-name').value.trim(),contact:document.getElementById('profile-contact').value.trim(),email:document.getElementById('profile-email').value.trim(),district:document.getElementById('profile-district').value.trim(),socials,avatar:draft.avatar||'',location:draft.location});let saved;try{saved=persist();}catch{saved=false;}if(saved===false||storageFailed){status('profile-save-error',T('Не удалось сохранить на устройстве. Изменения действуют в этой сессии.','Device storage failed. Changes remain in this session.'));return;}geoRequest++;draft=null;go('profile');},true);
// Migrate only exact, application-generated labels from older versions. Never filter user text.
const oldLogLabels={'Создан демозапрос помощнику':'Создан локальный запрос помощнику','Случай опубликован в демо':'Случай опубликован локально','Задача выполнена в демо':'Задача выполнена локально','Приём организацией подтверждён в демо':'Приём организацией подтверждён локально','Демо-помощник подтвердил задачу':'Помощник подтвердил задачу'};
for(const c of state.cases){if(c.publicPlace==='Демонстрационный район')c.publicPlace='Примерный район';for(const row of c.log||[]){if(oldLogLabels[row.text]){row.text=oldLogLabels[row.text];row.en=(row.en||'').replace(' in demo',' locally').replace('Demo helper request','Local helper request').replace('Demo helper','Helper');}}}
const before=render;render=(focus=false)=>{before(focus);if(screen!=='edit-profile'){draft=null;geoRequest++;avatarRequest++;}if(state.profile.avatar){app.querySelectorAll('.screen:not(.screen-outgoing) .app-header [data-go="profile"], .screen:not(.screen-outgoing) .app-header [data-action="go-profile"]').forEach(el=>{el.classList.add('profile-header-avatar');el.innerHTML=avatar(state.profile);});}if(['volunteers','organizations','helpers'].includes(screen)&&(state.profile.district||state.profile.location)){const root=app.querySelector('.screen:not(.screen-outgoing)>.scroll-content'),label=document.createElement('p');label.className='caption profile-search-area';label.textContent=T('Район поиска: ','Search area: ')+(state.profile.district||T('текущее местоположение','current location'))+T(' · каталог, расстояния примерные',' · catalog, illustrative distances');const title=root.querySelector('h1');title?.after(label);}};render();
})();

/* ===== src/js/14-polish.js ===== */
/* 14 · Polish layer (v12): подсветка вкладок и плавная смена экранов. */
(()=>{
  // Разделы жизненного цикла случая принадлежат вкладке «Случай».
  const caseScreens=['care','care-result','history','history-case','update'];
  const baseTab=tabFor;
  tabFor=id=>caseScreens.includes(id)?'case':baseTab(id);

  // Кроссфейд: новый экран лежит снизу полностью непрозрачным, уходящий гаснет сверху.
  // Прежняя схема гасила оба слоя одновременно, поэтому фон и нижняя панель на
  // середине перехода «проседали» по прозрачности.
  const baseRender=render;
  render=function(...args){
    const result=baseRender.apply(this,args);
    try{
      if(Array.isArray(pageAnimations)&&pageAnimations.length>1){
        const enter=pageAnimations[pageAnimations.length-1];
        enter.cancel();
        pageAnimations.pop();
      }
    }catch{}
    return result;
  };
})();

/* ===== src/js/15-soft-glass.js ===== */
/* 15 · Мягкое стекло (v13): перестройка главной и карточки случая, мини-кнопки,
   нижний бар со скользящим индикатором, веер документов. Работает поверх готового
   DOM после каждого render(), логика и обработчики прежних слоёв не меняются. */
(()=>{
  const reduced=()=>state.prefs.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE='cubic-bezier(.22,.7,.2,1)';
  const dockMemory={left:null,width:null,index:null};

  /* ---------- Карточка случая ---------- */
  const knownTraits=c=>['color','size','sex','breed','weight','features'].filter(k=>c[k]&&c[k]!=='unknown').length;
  function dateLabel(c){
    const d=new Date(c.foundAt||Date.now()),now=new Date();
    const day=d.toDateString()===now.toDateString()?T('Сегодня','Today'):d.toLocaleDateString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long'});
    return `${day} · #${c.number}`;
  }
  function softCase(page,detail){
    const card=page.querySelector('.case-stage > .card');
    if(!card||card.classList.contains('case-glass'))return;
    const pb=card.querySelector('.photo-button'),next=card.querySelector('.case-next');
    if(!pb||!next)return;
    const c=current(),badge=card.querySelector('.case-head .badge'),img=pb.querySelector('img');
    const scene=PANORAMA_SCENES.find(s=>s.species===c.species&&s.group===c.group);
    const traits=knownTraits(c);
    const arrowTarget=detail?'route':'case';
    const arrowLabel=detail?T('Открыть маршрут помощи','Open help journey'):T('Открыть случай','Open case');
    const head=document.createElement('div');
    head.className='cg-head';
    head.innerHTML=`<span class="cg-mark" aria-hidden="true">${I('pin')}</span><div class="cg-title"><h3 class="case-name">${e(name(c))}</h3><small>${e(dateLabel(c))}</small></div><button class="cg-arrow" data-go="${arrowTarget}" aria-label="${arrowLabel}">${I('arrow')}</button>`;
    const well=document.createElement('div');
    well.className='cg-well'+(detail?' large':'');
    well.append(pb);
    const thumbs=document.createElement('div');
    thumbs.className='cg-thumbs';
    thumbs.innerHTML=
      (img?`<button class="cg-thumb" data-go="media" aria-label="${T('Открыть фото','Open photo')}"><img src="${e(img.getAttribute('src'))}" alt=""></button>`:'')+
      (scene?`<button class="cg-thumb" data-panorama-open="${scene.id}" aria-label="${T('Место находки, сцена 360°','Find location, 360° scene')}"><img src="${e(scene.image)}" alt=""></button>`:'')+
      (traits?`<button class="cg-more" data-go="animal" aria-label="${T('Приметы','Features')}: ${traits}">+${traits}</button>`:'');
    well.append(thumbs);
    const cap=document.createElement('div');
    cap.className='cg-caption';
    if(badge)cap.append(badge);
    const text=document.createElement('span');
    text.innerHTML=`<strong>${e(c.publicPlace||T('Место уточняется','Place to be confirmed'))}</strong><small>${T('Примерная зона, без точного адреса','Approximate area, no exact address')}</small>`;
    cap.append(text);
    well.append(cap);
    card.classList.add('case-glass');
    card.prepend(well);
    card.prepend(head);
  }

  /* ---------- Главная ---------- */
  const SHORTCUTS=[['nearby','map','Рядом','Nearby'],['volunteers','user','Волонтёры','Volunteers'],['organizations','office','Организации','Organizations'],['favorites','heart','Избранное','Saved']];
  function softHome(page){
    const sc=page.querySelector('.scroll-content');
    if(!sc)return;
    const h1=sc.querySelector('.home-scout-centred h1');
    if(h1){
      const nm=(state.profile.name||'').trim();
      h1.innerHTML=`<span>${T('Привет','Hi')}${nm?', '+e(nm):''}!</span>${T('Чем помочь?','How can I help?')}`;
    }
    const shelf=page.querySelector('nav.home-shortcuts');
    const anchor=sc.querySelector('.home-scout-centred');
    if(shelf&&anchor){
      shelf.innerHTML=SHORTCUTS.map(([go,icon,ru,en])=>`<button data-go="${go}"><span class="mini">${I(icon)}</span><span>${T(ru,en)}</span></button>`).join('');
      anchor.after(shelf);
      shelf.style.removeProperty('bottom');
    }
    softCase(page,false);
  }

  /* ---------- Случай ---------- */
  function softCaseScreen(page){
    softCase(page,true);
    const stage=page.querySelector('.case-stage');
    if(stage&&!page.querySelector('.mini-actions')){
      const bar=document.createElement('div');
      bar.className='mini-actions';
      bar.innerHTML=[['download','flyer',T('Листовка','Flyer')],['edit','edit-animal',T('Изменить описание','Edit description')],['search','matches',T('Возможные совпадения','Possible matches')]]
        .map(([icon,go,label])=>`<button data-go="${go}" aria-label="${label}" title="${label}">${I(icon)}</button>`).join('');
      stage.after(bar);
    }
  }

  /* ---------- Нижний бар: скользящий индикатор и плавная смена состояний ---------- */
  function softDock(page){
    const dock=page.querySelector('.dock');
    if(!dock)return;
    const buttons=[...dock.querySelectorAll('button')];
    const index=buttons.findIndex(b=>b.classList.contains('active'));
    if(index<0)return;
    const pill=document.createElement('i');
    pill.className='dock-pill';
    pill.setAttribute('aria-hidden','true');
    dock.append(pill);
    const target=buttons[index];
    const left=target.offsetLeft,width=target.offsetWidth;
    pill.style.left=left+'px';
    pill.style.width=width+'px';
    const hadPrevious=dockMemory.index!==null&&dockMemory.index!==index&&dockMemory.left!==null;
    if(hadPrevious&&!reduced()){
      pill.animate([{left:dockMemory.left+'px',width:dockMemory.width+'px'},{left:left+'px',width:width+'px'}],{duration:380,easing:EASE});
      const activeColor=getComputedStyle(target).color,idleColor=getComputedStyle(buttons[dockMemory.index]).color;
      target.animate([{color:idleColor},{color:activeColor}],{duration:260,easing:'ease-out'});
      target.querySelector('.icon')?.animate([{transform:'scale(.82)'},{transform:'scale(1.1)',offset:.6},{transform:'scale(1)'}],{duration:380,easing:EASE});
      buttons[dockMemory.index].animate([{color:activeColor},{color:idleColor}],{duration:260,easing:'ease-out'});
    }
    dockMemory.index=index;dockMemory.left=left;dockMemory.width=width;
  }

  /* ---------- Документы: веер ---------- */
  const documentsBefore=V.documents;
  V.documents=()=>{
    const fan=`<section class="card doc-fan" aria-label="${T('Документы питомца','Pet documents')}"><p><b>${T('Всё в одном месте','Everything in one place')}</b>${T('Чип, прививки и паспорт хранятся приватно на этом устройстве.','Chip, vaccinations and passport are stored privately on this device.')}</p><div class="doc-stack" aria-hidden="true"><div class="doc-sheet"><span class="doc-ico">${I('shield')}</span><i></i><i></i><i></i><small>${T('Чип','Chip')}</small></div><div class="doc-sheet"><span class="doc-ico">${I('grid')}</span><i></i><i></i><i></i><small>${T('Прививки','Vaccines')}</small></div></div></section>`;
    return documentsBefore().replace('</h1>','</h1>'+fan);
  };

  /* ---------- Подключение к render ---------- */
  const renderBeforeSoft=render;
  render=function(...args){
    const result=renderBeforeSoft.apply(this,args);
    const page=app.querySelector('.screen:not(.screen-outgoing)');
    if(page){
      if(page.classList.contains('review-air')){page.classList.remove('review-air');try{updateHeaderInk()}catch{}}
      if(screen==='home')softHome(page);
      else if(screen==='case')softCaseScreen(page);
      softDock(page);
    }
    return result;
  };
})();

/* ===== src/js/16-qr.js ===== */
/* Минимальный генератор QR (byte mode, ECC L, версии 1–5, одна ECC-группа). Проверен декодером OpenCV. */
function qrMatrix(text){
  const bytes=[...new TextEncoder().encode(text)];
  const CAP=[0,19,34,55,80,108],TOTAL=[0,26,44,70,100,134],EC=[0,7,10,15,20,26];
  let ver=1;while(ver<5&&bytes.length>CAP[ver]-2)ver++;
  if(bytes.length>CAP[ver]-2)throw new Error('qr: text too long');
  const size=17+4*ver,dataCap=CAP[ver];
  const bits=[];const put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
  put(4,4);put(bytes.length,8);bytes.forEach(b=>put(b,8));
  put(0,Math.min(4,dataCap*8-bits.length));while(bits.length%8)bits.push(0);
  const data=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let j=0;j<8;j++)v=v<<1|bits[i+j];data.push(v)}
  for(let pad=0xEC;data.length<dataCap;pad^=0xEC^0x11)data.push(pad);
  const exp=new Array(512),log=new Array(256);let x=1;for(let i=0;i<255;i++){exp[i]=x;log[x]=i;x<<=1;if(x&256)x^=0x11D}for(let i=255;i<512;i++)exp[i]=exp[i-255];
  const mul=(a,b)=>a&&b?exp[log[a]+log[b]]:0;
  let gen=[1];for(let i=0;i<EC[ver];i++){const next=new Array(gen.length+1).fill(0);gen.forEach((c,j)=>{next[j]^=c;next[j+1]^=mul(c,exp[i])});gen=next}
  const rem=new Array(EC[ver]).fill(0);data.forEach(d=>{const f=d^rem.shift();rem.push(0);gen.slice(1).forEach((g,i)=>{rem[i]^=mul(g,f)})});
  const words=data.concat(rem);if(words.length!==TOTAL[ver])throw new Error('qr: size');
  const m=Array.from({length:size},()=>new Array(size).fill(false)),fn=Array.from({length:size},()=>new Array(size).fill(false));
  const set=(px,py,dark)=>{m[py][px]=dark;fn[py][px]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const px=cx+dx,py=cy+dy;if(px<0||py<0||px>=size||py>=size)continue;const d=Math.max(Math.abs(dx),Math.abs(dy));set(px,py,d!==2&&d!==4)}
  if(ver>1){const c=size-7;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(c+dx,c+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
  const drawFormat=mask=>{const d=1<<3|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const f=(d<<10|r)^0x5412,b=i=>((f>>>i)&1)!==0;
    for(let i=0;i<=5;i++)set(8,i,b(i));set(8,7,b(6));set(8,8,b(7));set(7,8,b(8));for(let i=9;i<15;i++)set(14-i,8,b(i));
    for(let i=0;i<8;i++)set(size-1-i,8,b(i));for(let i=8;i<15;i++)set(8,size-15+i,b(i));set(8,size-8,true)};
  drawFormat(0);
  const bitsAll=[];words.forEach(w=>{for(let i=7;i>=0;i--)bitsAll.push((w>>>i)&1)});
  let k=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const px=right-j,up=((right+1)&2)===0,py=up?size-1-vert:vert;if(!fn[py][px]&&k<bitsAll.length){m[py][px]=bitsAll[k]===1;k++}}}
  const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const penalty=g=>{let p=0;for(let a=0;a<size;a++)for(const horiz of [true,false]){let run=1;for(let b=1;b<size;b++){const cur=horiz?g[a][b]:g[b][a],prev=horiz?g[a][b-1]:g[b-1][a];if(cur===prev){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
    for(let y=0;y<size-1;y++)for(let x2=0;x2<size-1;x2++){const c=g[y][x2];if(c===g[y][x2+1]&&c===g[y+1][x2]&&c===g[y+1][x2+1])p+=3}
    let dark=0;g.forEach(r=>r.forEach(c=>{if(c)dark++}));p+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10;return p};
  let best=null,bestMask=0;
  for(let mk=0;mk<8;mk++){const g=m.map(r=>r.slice());for(let y=0;y<size;y++)for(let x2=0;x2<size;x2++)if(!fn[y][x2]&&MASKS[mk](x2,y))g[y][x2]=!g[y][x2];const p=penalty(g);if(best===null||p<best.p){best={p,g};bestMask=mk}}
  drawFormat(bestMask);const out=best.g.map(r=>r.slice());
  // формат-биты нужно перенести в итоговую матрицу
  for(let y=0;y<size;y++)for(let x2=0;x2<size;x2++)if(fn[y][x2])out[y][x2]=m[y][x2];
  return out;
}
function qrSvg(text,{dark='#17191B',light='#FFFFFF',quiet=2,label=''}={}){
  const g=qrMatrix(text),n=g.length,t=n+quiet*2;let path='';
  g.forEach((r,y)=>r.forEach((c,x)=>{if(c)path+=`M${x+quiet} ${y+quiet}h1v1h-1z`}));
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${t}" height="${t}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

/* ===== src/js/17-v14.js ===== */
/* v14: функции продукта — срочность, автозаполнение, приватность места, статус ответа, уведомления, офлайн,
   поиск владельца, листовка с QR, репутация, команда, награды, вклад, истории, жесты, размер текста. */
(()=>{
  const S=()=>{state.v14??={};const s=state.v14;
    s.loc??='district';s.quiet??=false;s.onlyUrgent??=false;s.offline??=false;s.textScale??=100;s.flyerFormat??='a5';
    s.feedback??={};s.team??={};s.stories??={};s.ownerAsk??={};s.read??={};return s};
  const dateFmt=d=>new Date(d).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'long',timeZone:'Europe/Moscow'});
  const reduced=()=>document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROUTE=(id,ru,en,section,desc)=>{if(!SCREEN_REGISTRY.some(s=>s[0]===id))SCREEN_REGISTRY.push([id,ru,en,section,desc])};

  /* ---------- общие компоненты ---------- */
  const empty=(icon,title,text,action='')=>`<section class="empty" role="status"><img class="empty-scout" src="assets/scout-listening.png" alt=""><span class="empty-ico" aria-hidden="true">${I(icon)}</span><h3>${title}</h3><p>${text}</p>${action}</section>`;
  const skeleton=(n=3)=>`<div class="skeleton-list" role="status" aria-label="${T('Загрузка','Loading')}">${Array.from({length:n},()=>'<div class="skeleton-card"><i class="sk sk-circle"></i><span><i class="sk sk-line"></i><i class="sk sk-line short"></i></span></div>').join('')}</div>`;
  const ring=(pct,label,size=76)=>{const r=(size-10)/2,c=2*Math.PI*r;return `<div class="v14-ring" style="--s:${size}px" role="img" aria-label="${label}"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="rt" cx="${size/2}" cy="${size/2}" r="${r}"/><circle class="rv" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/></svg><b>${Math.round(pct)}<small>%</small></b></div>`};
  const seg=(key,options,value,label)=>`<div class="seg" role="radiogroup" aria-label="${label}">${options.map(([v,t])=>`<button type="button" role="radio" aria-checked="${v===value}" class="${v===value?'active':''}" data-v14="${key}:${v}">${t}</button>`).join('')}</div>`;
  const sw=(key,label,sub,on)=>`<label class="preference-row"><span>${label}${sub?`<small>${sub}</small>`:''}</span><input type="checkbox" role="switch" data-v14-toggle="${key}" ${on?'checked':''}></label>`;
  const tile=(icon,title,detail,go)=>`<button class="card account-tile" data-go="${go}"><span class="account-tile-icon">${I(icon)}</span><strong>${title}</strong><span class="account-tile-detail">${detail}</span><span class="account-tile-arrow" aria-hidden="true">${I('arrow')}</span></button>`;
  const banner=(title,text)=>{app.querySelector('.push-banner')?.remove();const b=document.createElement('div');b.className='push-banner';b.setAttribute('role','status');b.innerHTML=`<span class="pb-ico">${I('bell')}</span><span><b>${e(title)}</b><small>${e(text)}</small></span>`;app.appendChild(b);requestAnimationFrame(()=>b.classList.add('in'));setTimeout(()=>{b.classList.remove('in');setTimeout(()=>b.remove(),400)},4200)};
  const activeCases=()=>state.cases.filter(c=>c.lifecycle!=='closed');
  const closedCases=()=>state.cases.filter(c=>c.lifecycle==='closed');

  /* ---------- 5. Пустые состояния на существующих экранах ---------- */
  const swapNotice=(id,render)=>{const before=V[id];V[id]=()=>{const h=before();return h.replace(/<div class="notice">[^<]*<\/div>/,render)}};
  swapNotice('history',()=>empty('clock',T('Пока нет закрытых случаев','No closed cases yet'),T('Когда вы закроете случай, он сохранится здесь вместе с историей.','When you close a case it will be kept here with its history.')));
  swapNotice('chats',()=>empty('chat',T('Диалогов пока нет','No conversations yet'),T('Диалог появится после запроса помощнику или заявителю.','A conversation starts after you send a request to a helper or claimant.')));
  swapNotice('tasks',()=>empty('check',T('Задач пока нет','No tasks yet'),T('Выберите помощника — и здесь появится согласованная задача.','Choose a helper and the agreed task will appear here.')));
  const statesBefore=V.states;
  V.states=()=>{const h=statesBefore();if(typeof componentState==='undefined')return h;
    if(componentState==='loading')return h.replace(/<div class="card state-demo[^"]*"[\s\S]*?<\/div>/,`<div class="state-demo loading" aria-busy="true">${skeleton(2)}</div>`);
    if(componentState==='empty')return h.replace(/<div class="card state-demo[^"]*"[\s\S]*?<\/div>/,`<div class="state-demo empty-demo">${empty('info',T('Пока пусто','Nothing here yet'),T('Здесь появятся данные, когда вы сделаете первый шаг.','Data will appear here after your first step.'))}</div>`);
    return h};

  /* ---------- 7. Срочность: шкала ---------- */
  const urgencyScale=()=>{const q=state.triage||{answers:[]},res=state.triage?.result||'attention';
    const levels=[['ongoing',T('Наблюдение','Observe')],['attention',T('Внимание','Attention')],['urgent',T('Срочно','Urgent')]];
    const idx=Math.max(0,levels.findIndex(l=>l[0]===res)),a=q.answers||[];
    const yes=a.filter(x=>x==='yes').length,no=a.filter(x=>x==='no').length,unk=a.filter(x=>x==='unknown').length;
    const c=current();
    return `<section class="card urg" aria-label="${T('Шкала срочности','Urgency scale')}"><div class="urg-bar" role="img" aria-label="${levels[idx][1]}"><i class="s0 ${idx>=0?'on':''}"></i><i class="s1 ${idx>=1?'on':''}"></i><i class="s2 ${idx>=2?'on':''}"></i><b class="urg-marker" style="left:${(idx*50)}%"></b></div><div class="urg-labels">${levels.map((l,i)=>`<span class="${i===idx?'cur':''}">${l[1]}</span>`).join('')}</div><p class="caption">${T('Шкала — ориентир для следующего шага. Это не диагноз.','The scale is a guide to the next step. It is not a diagnosis.')}</p></section>`};
  const triageResultBefore=V['triage-result'];
  V['triage-result']=()=>triageResultBefore().replace('</h1>','</h1>'+urgencyScale());

  /* ---------- 8. Автозаполнение по фото ---------- */
  const SPECIES=()=>({dog:T('Собака','Dog'),cat:T('Кошка','Cat'),other:T('Другое','Other')});
  const COLORS=()=>({beige:T('рыжий / бежевый','ginger / beige'),gray:T('серый','grey'),black:T('чёрный','black'),white:T('белый','white'),brown:T('коричневый','brown')});
  const autofillCard=c=>{if(!c.photo||c.lifecycle==='closed')return '';const done=c.autofilled;
    return `<section class="card autofill" aria-label="${T('Подсказка Скаута по фото','Scout photo suggestion')}"><div class="af-head"><img src="${e(c.photo)}" alt=""><span><b>${T('Скаут посмотрел фото','Scout looked at the photo')}</b><small>${T('Проверьте и подтвердите — это подсказка','Check and confirm — this is a suggestion')}</small></span></div><div class="chip-row"><span class="chip">${T('Вид','Species')}: ${SPECIES()[c.species]||SPECIES().other}</span><span class="chip">${T('Окрас','Colour')}: ${COLORS()[c.color]||T('не определён','unclear')}</span>${c.features?`<span class="chip">${T('Примета','Feature')}: ${e(lang==='ru'?c.features:c.featuresEN||c.features)}</span>`:''}</div><div class="af-actions">${done?`<span class="badge closed">${I('check')}${T('Подтверждено вами','Confirmed by you')}</span>`:`<button class="button dark compact" data-v14="autofill">${T('Подтвердить','Confirm')}</button><button class="button secondary compact" data-v14="autofill-edit">${T('Править','Edit')}</button>`}</div></section>`};
  const editAnimalBefore=V['edit-animal'];
  V['edit-animal']=()=>{const c=current();let h=editAnimalBefore();if(c.lifecycle==='closed')return h;return h.replace('</h1>','</h1>'+autofillCard(c)+locCard())};

  /* ---------- 9. Приватность места ---------- */
  const LOC=()=>({district:[T('Только район','District only'),T('На карте и в ленте виден примерный район (около 1 км). Точная точка скрыта.','The map and feed show an approximate district (about 1 km). The exact spot stays hidden.')],
    hidden:[T('Скрыть место','Hide location'),T('Место не видно ни в ленте, ни на карте. Его знают только вы и согласованные помощники.','The location is hidden from the feed and map. Only you and agreed helpers know it.')],
    exact:[T('После согласия','After consent'),T('Точная точка открывается помощнику только после взаимного согласия на контакты.','The exact spot opens to a helper only after mutual contact consent.')]});
  const locCard=()=>{const s=S(),l=LOC();return `<section class="card loc-card" aria-label="${T('Приватность места','Location privacy')}"><div class="loc-vis" data-mode="${s.loc}" aria-hidden="true"><i class="halo"></i><i class="ring"></i><i class="dot"></i></div><h3>${T('Как показывать место','How to show the location')}</h3>${seg('loc',Object.entries(l).map(([k,x])=>[k,x[0]]),s.loc,T('Показ места','Location display'))}<p class="caption" id="loc-desc">${l[s.loc][1]}</p></section>`};
  const nearbyCaseBefore=V['nearby-case'];
  V['nearby-case']=()=>nearbyCaseBefore().replace('<button class="button "',`<section class="card loc-note"><span class="pb-ico">${I('pin')}</span><p>${LOC()[S().loc][1]}</p></section><button class="button "`);

  /* ---------- 10. Лестница ответа ---------- */
  const ladder=c=>{const t=c.tasks||[],has=k=>t.some(x=>x.status===k),
      seen=c.lifecycle!=='draft',replied=t.length>0||Object.keys(c.chats||{}).length>0,
      accepting=has('assigned')||has('completed')||c.intakeConfirmed,taken=has('completed')||['owner','foster','organization'].includes(c.outcome);
    const steps=[[T('Увидели','Seen'),seen,'search'],[T('Ответили','Replied'),replied,'chat'],[T('Принимают','Accepting'),accepting,'check'],[T('Забрали','Taken in'),taken,'heart']];
    const cur=steps.findIndex(s=>!s[1]);
    return `<section class="card ladder" aria-label="${T('Статус ответа помощи','Help response status')}"><div class="ladder-head"><h3>${T('Ответ помощи','Help response')}</h3><span class="caption">${steps.filter(s=>s[1]).length} / 4</span></div><ol class="ladder-steps">${steps.map((s,i)=>`<li class="${s[1]?'done':i===cur?'now':''}" ${i===cur?'aria-current="step"':''}><span class="lg-dot">${I(s[1]?'check':s[2])}</span><b>${s[0]}</b></li>`).join('')}</ol><p class="caption">${T('Ответ организации не означает, что животное принято.','An organisation’s reply does not mean the animal is accepted.')}</p></section>`};
  const tasksBefore=V.tasks;
  V.tasks=()=>tasksBefore().replace('</h1>','</h1>'+ladder(current()));

  /* ---------- 11. Уведомления ---------- */
  const notifItems=()=>{const s=S(),out=[];
    for(const c of state.cases){const nm=name(c),n='#'+c.number;
      if(c.lifecycle==='closed'){out.push({id:'u'+c.id,c,urgent:false,t:T('Добавьте итоговое обновление','Add a closing update'),d:`${nm} ${n}`,go:'update'});continue}
      if(c.lifecycle==='draft')out.push({id:'d'+c.id,c,urgent:false,t:T('Черновик ждёт подтверждения','Draft is waiting for confirmation'),d:`${nm} ${n}`,go:'edit-animal'});
      if(c.urgency==='urgent')out.push({id:'e'+c.id,c,urgent:true,t:T('Срочно: свяжитесь со специалистом','Urgent: contact a specialist'),d:`${nm} ${n}`,go:'emergency'});
      if((c.tasks||[]).some(x=>x.status==='offered'))out.push({id:'w'+c.id,c,urgent:false,t:T('Ждём ответ помощника','Waiting for a helper’s reply'),d:`${nm} ${n}`,go:'tasks'});
      if(c.lifecycle==='published')out.push({id:'s'+c.id,c,urgent:false,t:T('Проверьте состояние животного','Check on the animal'),d:`${nm} ${n} · ${T('сегодня','today')}`,go:'case'});}
    return s.onlyUrgent?out.filter(x=>x.urgent):out};
  V.notifications=()=>{const s=S(),items=notifItems();
    return `<h1>${T('Уведомления','Notifications')}</h1><p class="muted">${T('Напоминания по этапам случая. Тихие часы и только срочные — на ваш выбор.','Reminders by case stage. Quiet hours and urgent-only are up to you.')}</p><section class="card notif-settings">${sw('quiet',T('Тихие часы','Quiet hours'),T('22:00–08:00, кроме срочных','22:00–08:00, except urgent'),s.quiet)}${sw('onlyUrgent',T('Только срочные','Urgent only'),'',s.onlyUrgent)}</section><h2 class="v14-h2">${T('Сейчас','Now')}</h2>${items.length?`<div class="notif-list">${items.map(x=>`<button class="notif ${x.urgent?'urgent':''} ${s.read[x.id]?'read':''}" data-v14="notif:${x.id}:${x.go}:${x.c.id}"><span class="pb-ico">${I(x.urgent?'warning':'bell')}</span><span><b>${x.t}</b><small>${x.d}</small></span><span class="tail">${I('arrow')}</span></button>`).join('')}</div>`:empty('bell',T('Пока тихо','All quiet'),T('Срочных напоминаний нет. Мы сообщим, когда понадобится ваш шаг.','No urgent reminders. We will tell you when a step is needed.'))}<button class="button secondary mt" data-v14="notif-demo">${T('Показать уведомление','Show a notification')}</button>`};
  ROUTE('notifications','Уведомления','Notifications','Главная','Напоминания по этапам случая; тихие часы; только срочные.');

  /* ---------- 12. Офлайн ---------- */
  const isOffline=()=>S().offline||navigator.onLine===false;
  V.offline=()=>{const items=(typeof SELF_HELP!=='undefined'?SELF_HELP:[]).slice(0,6);
    return `<h1>${T('Без сети','Offline')}</h1><p class="muted">${T('Самое нужное сохранено на устройстве и открывается без интернета.','The essentials are stored on the device and open without internet.')}</p><section class="card offline-sos"><span class="pb-ico">${I('warning')}</span><div><b>${T('Срочно: 112','Urgent: 112')}</b><small>${T('Единый номер экстренных служб. Ветеринарную службу вашего города лучше сохранить заранее.','The single emergency number. Save your city’s veterinary service number in advance.')}</small></div></section><h2 class="v14-h2">${T('Памятки без сети','Guides offline')}</h2><div class="stack">${items.map(a=>`<button class="list-row" data-help-article="${a.id}">${I(a.icon||'info')}<span>${e(a.title)}<small>${T('Сохранено','Saved')} · ${a.time} ${T('мин','min')}</small></span><span class="tail">${I('arrow')}</span></button>`).join('')}</div><section class="card mt"><h3>${T('Что недоступно','Not available')}</h3><p class="caption">${T('Скаут, карта рядом и чат с помощниками ответят, когда появится сеть. Черновик случая сохранится на устройстве.','Scout, the nearby map and helper chat reply when the network returns. Your case draft stays on the device.')}</p></section>`};
  ROUTE('offline','Без сети','Offline','Главная','Памятки и экстренный номер без интернета.');
  const netBanner=page=>{if(!isOffline()||screen==='offline')return;const sc=page.querySelector('.scroll-content');if(!sc)return;const b=document.createElement('div');b.className='net-banner';b.setAttribute('role','status');b.innerHTML=`${I('wifi')}<span><b>${T('Нет сети','No connection')}</b><small>${T('Памятки доступны без интернета','Guides work without internet')}</small></span><button data-go="offline">${T('Открыть','Open')}</button>`;sc.prepend(b)};
  addEventListener('online',()=>{try{render()}catch{}});addEventListener('offline',()=>{try{render()}catch{}});

  /* ---------- 13. Поиск владельца ---------- */
  const matchCandidates=c=>{const base=[{id:'m1',title:T('Похожее объявление','Similar report'),place:T('Городской парк','City park'),days:2,species:c.species,color:c.color,size:'unknown',sex:'unknown',mark:'unknown',area:true},
    {id:'m2',title:T('Объявление в соседнем районе','Report in a nearby district'),place:T('Набережная','Embankment'),days:5,species:c.species,color:'other',size:c.size,sex:'unknown',mark:'unknown',area:false}];
    return base.map(m=>{const f=[[T('Вид','Species'),m.species===c.species?'yes':'no'],[T('Окрас','Colour'),m.color===c.color?'yes':'no'],[T('Габариты','Size'),m.size==='unknown'||c.size==='unknown'?'unk':m.size===c.size?'yes':'no'],[T('Пол','Sex'),'unk'],[T('Приметы','Marks'),'unk'],[T('Район','Area'),m.area?'yes':'unk']];
      const score=f.reduce((a,x)=>a+(x[1]==='yes'?1:x[1]==='unk'?.35:0),0)/f.length*100;return {...m,f,score}}).sort((a,b)=>b.score-a.score)};
  V.matches=()=>{const c=current(),s=S();return `${scope()}<h1>${T('Возможные совпадения','Possible matches')}</h1>${hint(T('Сходство признаков — повод проверить. Это не вероятность и не доказательство владельца.','Feature similarity is a reason to check. It is not a probability or proof of ownership.'))}${matchCandidates(c).map(m=>{const asked=s.ownerAsk[c.id+':'+m.id];return `<section class="card match-card"><div class="mc-top">${ring(m.score,T('Сходство признаков','Feature similarity'))}<div><h3>${m.title}</h3><small class="caption">${m.place} · ${m.days} ${T('дн. назад','days ago')}</small><small class="caption">${T('сходство признаков','feature similarity')}</small></div></div><div class="chip-row">${m.f.map(x=>`<span class="chip ${x[1]}">${I(x[1]==='yes'?'check':x[1]==='no'?'close':'info')}${x[0]}</span>`).join('')}</div><div class="stack mt"><button class="button secondary" data-go="match">${T('Сравнить признаки','Compare features')}</button>${asked?`<button class="button ghost" disabled>${I('check')}${T('Запрос отправлен','Request sent')}</button>`:`<button class="button" data-v14="owner-ask:${m.id}">${T('Запросить скрытую метку','Ask for the hidden mark')}</button>`}</div></section>`}).join('')}<section class="card"><p class="caption">${T('Запрос просит владельца самому назвать скрытую метку. Мы её не показываем, чтобы никто не мог угадать.','The request asks the owner to name the hidden mark. We never show it, so nobody can guess it.')}</p></section><button class="button secondary" data-go="scanner">${T('Посмотреть ID-слепок','View ID record')}</button>`};

  /* ---------- 14. Листовка с QR ---------- */
  const flyerUrl=c=>'https://podhvat.example/c/'+c.number;
  V.flyer=()=>{const c=current(),s=S();return `${scope()}<h1>${T('Листовка без лишних данных','Flyer without private data')}</h1>${seg('flyer',[['a5',T('Лист A5','A5 sheet')],['story',T('Сторис','Story')]],s.flyerFormat,T('Формат листовки','Flyer format'))}<div class="preview-flyer fl-${s.flyerFormat}"><img class="animal-photo" src="${e(c.photo||'assets/dog.png')}" alt="${e(name(c))}"><div class="fl-body"><h2>${T('Найдено животное','Animal found')}</h2><p>${e(name(c))} · #${c.number}</p><p>${T('Примерный район','Approximate area')}: ${e(c.publicPlace)}</p></div><div class="fl-qr">${qrSvg(flyerUrl(c),{label:T('QR-код карточки','Case QR code')})}<small>podhvat.example/c/${c.number}</small></div></div><div class="public-hidden">${I('shield')}${T('Телефон, чип и точный адрес исключены.','Phone, chip and exact address are excluded.')}</div><div class="stack">${button(T('Скачать SVG-листовку','Download SVG flyer'),'download-flyer')}<button class="button secondary" data-v14="flyer-copy">${T('Скопировать текст','Copy text')}</button>${link(T('Выбрать каналы','Choose channels'),'channels','ghost')}</div>`};
  exportFlyer=function(){const c=current(),f=S().flyerFormat,W=800,H=f==='story'?1420:1000;
    const g=qrMatrix(flyerUrl(c)),n=g.length,q=4,sc=Math.floor(220/(n+q*2)),ox=W-72-sc*(n+q*2)-12,oy=H-72-sc*(n+q*2)-12;
    let cells='';g.forEach((r,y)=>r.forEach((v,x)=>{if(v)cells+=`<rect x="${ox+(x+q)*sc}" y="${oy+(y+q)*sc}" width="${sc}" height="${sc}"/>`}));
    const lines=[T('Найдено животное','Animal found'),name(c)+' · #'+c.number,T('Примерный район: ','Approximate area: ')+c.publicPlace];
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F8F9F7"/><rect x="40" y="40" width="${W-80}" height="${H-80}" rx="40" fill="#FFFFFF"/><rect x="72" y="72" width="${W-144}" height="190" rx="32" fill="#DBF95B"/>${lines.map((s,i)=>`<text x="104" y="${i?170+i*38:150}" font-family="Arial,sans-serif" font-size="${i?26:44}" font-weight="${i?400:700}" fill="#17191B">${e(s)}</text>`).join('')}<rect x="${ox}" y="${oy}" width="${sc*(n+q*2)}" height="${sc*(n+q*2)}" rx="16" fill="#FFFFFF"/><g fill="#17191B">${cells}</g><text x="72" y="${H-100}" font-family="Arial,sans-serif" font-size="22" fill="#556166">${e(T('Телефон и точный адрес скрыты','Phone and exact address hidden · sample link'))}</text></svg>`;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));a.download='podhvat-case-'+c.number+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  const copyText=async text=>{try{await navigator.clipboard.writeText(text);toast(T('Текст скопирован','Text copied'))}catch{toast(T('Копирование недоступно: выделите текст вручную.','Copying is unavailable: select the text manually.'))}};

  /* ---------- 15. Репутация ---------- */
  const REP={v1:{r:24,m:18,c:9,b:['fast']},o1:{r:61,m:42,c:37,b:['fast']},o2:{r:33,m:55,c:21,b:['wild']},v2:{r:17,m:25,c:12,b:['fast']}};
  const BADGE=()=>({fast:T('Отвечает быстро','Replies fast'),wild:T('Принимает диких','Takes wild animals'),calm:T('Спокойно ведёт диалог','Keeps calm')});
  const repCard=id=>{const x=REP[id];if(!x)return '';return `<section class="card rep"><h3>${T('Факты о помощи','Help facts')}</h3><div class="helper-facts"><div><small>${T('Ответов','Replies')}</small><strong>${x.r}</strong></div><div><small>${T('Время ответа','Reply time')}</small><strong>${x.m} ${T('мин','min')}</strong></div><div><small>${T('Закрыто','Closed')}</small><strong>${x.c}</strong></div></div><div class="chip-row">${x.b.map(b=>`<span class="chip lime">${I('check')}${BADGE()[b]}</span>`).join('')}</div><p class="caption">${T('Публично показываются только факты, без оценок людей.','Only facts are shown publicly, never judgements of people.')}</p></section>`};
  const helperBefore=V.helper;
  V.helper=()=>{const h=helperBefore(),i=h.indexOf('</section>');return i<0?h:h.slice(0,i+10)+repCard(helperId)+h.slice(i+10)};
  const FB=()=>[['fast',T('Быстро ответил','Replied fast')],['ontime',T('Приехал вовремя','Arrived on time')],['took',T('Принял животное','Took the animal')],['kind',T('Был вежлив','Was polite')]];
  const feedbackCard=c=>{const sel=S().feedback[c.id]||[],hs=helpers.filter(h=>c.consents?.[h.id]||(c.tasks||[]).some(t=>t.helperId===h.id)),h=hs[0]||helpers[0];
    return `<section class="card fb"><h3>${T('Что помогло?','What helped?')}</h3><p class="caption">${T('Отметьте факты о помощи — оценок и комментариев о людях нет.','Mark facts about the help — there are no ratings or comments about people.')}</p><div class="fb-who">${I(h.kind==='person'?'user':'office')}<b>${e(lang==='ru'?h.name:h.en)}</b></div><div class="chip-row">${FB().map(([k,t])=>`<button class="chip-btn ${sel.includes(k)?'on':''}" aria-pressed="${sel.includes(k)}" data-v14="fb:${k}">${sel.includes(k)?I('check'):''}${t}</button>`).join('')}</div></section>`};
  const historyBefore=V['history-case'];
  V['history-case']=()=>{const h=historyBefore(),c=current(),re=/<h3>(?:Обновления участников|Participant updates)/,m=h.search(re);return m<0?h+feedbackCard(c):h.slice(0,m)+feedbackCard(c)+h.slice(m)};

  /* ---------- 16. Команда случая ---------- */
  const RN={coord:['Координатор','Coordinator'],transport:['Перевозка','Transport'],foster:['Передержка','Foster care'],vet:['Специалист','Specialist']};
  const ROLES=()=>[{id:'coord',ic:'target',n:T('Координатор','Coordinator'),d:T('Ведёт случай и журнал','Leads the case and the log'),types:[],self:true},
    {id:'transport',ic:'scooter',n:T('Перевозка','Transport'),d:T('Довезти до места помощи','Get the animal to help'),types:['transport'],domestic:true},
    {id:'foster',ic:'home',n:T('Передержка','Foster care'),d:T('Временный дом','A temporary home'),types:['foster'],domestic:true},
    {id:'vet',ic:'shield',n:T('Специалист','Specialist'),d:T('Осмотр и рекомендации','Examination and advice'),types:['clinic','specialist']}];
  V.team=()=>{const c=current(),t=S().team[c.id]||{},rs=ROLES().filter(r=>!r.domestic||!restricted(c));
    return `${scope()}<h1>${T('Команда случая','Case team')}</h1><p class="muted">${T('Роли делят задачу между людьми. Контакты открываются только после согласия.','Roles split the work between people. Contacts open only after consent.')}</p><div class="team-list">${rs.map(r=>{const hid=r.self?'me':t[r.id],h=hid&&hid!=='me'?helpers.find(x=>x.id===hid):null;return `<section class="card team-role"><span class="team-ico">${I(r.ic)}</span><div class="tr-body"><b>${r.n}</b><small>${r.d}</small></div>${r.self?`<span class="chip lime">${I('user')}${T('Вы','You')}</span>`:h?`<button class="chip-btn on" data-v14="assign:${r.id}">${e(lang==='ru'?h.name:h.en)}</button>`:`<button class="chip-btn" data-v14="assign:${r.id}">${T('Назначить','Assign')}</button>`}</section>`}).join('')}</div><h2 class="v14-h2">${T('Общий журнал','Shared log')}</h2>${timeline(c.log.slice(-6))}`};
  ROUTE('team','Команда случая','Case team','Случай','Роли: координатор, перевозка, передержка, специалист; общий журнал.');
  const prevTab=tabFor;tabFor=id=>id==='team'?'case':prevTab(id);

  /* ---------- 17–18. Награды, вклад ---------- */
  const SEASON_END=new Date('2026-10-31T23:59:59+03:00');
  const seasonCount=()=>Math.min(3,state.cases.filter(c=>c.lifecycle!=='draft'&&new Date(c.foundAt).getMonth()===new Date().getMonth()).length);
  const seasonCard=()=>{const n=seasonCount(),over=new Date()>SEASON_END;return `<section class="card season"><div class="se-top">${ring(n/3*100,T('Прогресс серии','Series progress'),72)}<div><span class="badge lime">${T('Лимитированная серия','Limited series')}</span><h3>${T('Тёплый октябрь','Warm October')}</h3><small class="caption">${over?T('Серия завершена','Series is over'):T('До 31 октября','Until 31 October')} · ${n} ${T('из','of')} 3 ${T('случаев за месяц','cases this month')}</small></div></div><p class="caption">${T('Награда за помощь, а не за скорость: считаются только случаи с подтверждёнными данными.','A reward for help, not speed: only cases with confirmed data count.')}</p></section>`};
  const awardsBefore=V.awards;
  V.awards=()=>{const h=awardsBefore(),i=h.indexOf('<div class="award-list">');const nav=`<div class="stack mt">${link(T('Мой вклад','My impact'),'stats','secondary')}${link(T('Истории с хорошим концом','Good-ending stories'),'stories','ghost')}</div>`;return (i<0?h:h.slice(0,i)+seasonCard()+h.slice(i))+nav};
  const posOf=(c,i)=>{const n=parseInt(c.number,10)||i+1;return [(n*37)%86+7,(n*53)%70+15]};
  V.stats=()=>{const cl=closedCases().length,ac=activeCases().length,hs=new Set(state.cases.flatMap(c=>Object.keys(c.consents||{}))).size,aw=Object.keys(state.awards||{}).length;
    return `<h1>${T('Мой вклад','My impact')}</h1><p class="muted">${T('Только ваши данные на этом устройстве.','Only your data on this device.')}</p><div class="stat-grid"><section class="card stat"><b>${cl}</b><small>${T('закрыто случаев','cases closed')}</small></section><section class="card stat"><b>${ac}</b><small>${T('в работе','in progress')}</small></section><section class="card stat"><b>${hs}</b><small>${T('помощников подключено','helpers connected')}</small></section><section class="card stat"><b>${aw}</b><small>${T('наград','awards')}</small></section></div><section class="card help-map"><h3>${T('Карта помощи','Help map')}</h3><div class="hm-grid" role="img" aria-label="${T('Схема районов без адресов','District diagram without addresses')}">${state.cases.map((c,i)=>{const [x,y]=posOf(c,i);return `<i class="hm-dot ${c.lifecycle==='closed'?'done':''}" style="left:${x}%;top:${y}%"></i>`}).join('')}</div><p class="caption">${T('Районы без адресов: точные места не сохраняются.','Districts without addresses: exact places are never stored.')}</p></section>${seasonCard()}<button class="button" data-v14="share-stats">${T('Скопировать итог','Copy summary')}</button><div class="stack mt">${link(T('Истории с хорошим концом','Good-ending stories'),'stories','secondary')}</div>`};
  ROUTE('stats','Мой вклад','My impact','Профиль','Закрытые случаи, помощники, награды, карта районов; итог для обмена.');

  /* ---------- 19. Истории ---------- */
  const STORIES=()=>[{id:'s1',a:'assets/dog.png',b:'assets/panoramas/park.jpg',t:T('Рыжий пёс вернулся домой','A ginger dog got back home'),d:T('Владелец узнал пса по приметам и назвал скрытую метку. Прошло два дня.','The owner recognised the dog by its marks and named the hidden mark. Two days passed.')},
    {id:'s2',a:'assets/cat.png',b:'assets/panoramas/courtyard.jpg',t:T('Кошка нашла передержку','A cat found foster care'),d:T('Волонтёр принял кошку на две недели, пока искали владельца.','A volunteer took the cat for two weeks while the owner was sought.')}];
  V.stories=()=>{const own=closedCases(),s=S();
    return `<h1>${T('Истории с хорошим концом','Good-ending stories')}</h1><p class="muted">${T('Истории публикуются только с согласия людей. Адреса и контакты не показываются.','Stories are published only with consent. Addresses and contacts are never shown.')}</p><div class="story-list">${STORIES().map(x=>`<article class="card story"><div class="ba"><figure><img src="${x.a}" alt=""><figcaption>${T('До','Before')}</figcaption></figure><figure><img src="${x.b}" alt=""><figcaption>${T('После','After')}</figcaption></figure></div><h3>${x.t}</h3><p>${x.d}</p></article>`).join('')}</div><h2 class="v14-h2">${T('Ваши истории','Your stories')}</h2>${own.length?own.map(c=>`<article class="card story own"><h3>${e(name(c))} #${c.number}</h3><p>${outcomes()[c.outcome]||''}</p>${sw('story-'+c.id,T('Показывать в ленте','Show in the feed'),T('Только с вашего согласия','Only with your consent'),!!s.stories[c.id])}</article>`).join(''):empty('heart',T('Пока нет историй','No stories yet'),T('Когда вы закроете первый случай, здесь появится возможность рассказать о нём — по желанию.','When you close your first case, you can choose to share its story here.'))}`};
  ROUTE('stories','Истории','Stories','Профиль','Истории закрытых случаев «до / после», публикация только с согласия.');

  /* ---------- 2–3. Скаут: файлы чата и структурные ответы ---------- */
  const scoutExtras=page=>{const thread=page.querySelector('.guided-thread');if(!thread)return;const s=guidedSession();
    const ids=(s.photos||[]).filter(id=>chatPhotoCache.get(id));
    if(ids.length&&!thread.querySelector('.chat-files')){const shown=ids.slice(0,3),more=ids.length-shown.length;
      const card=document.createElement('div');card.className='chat-files';card.innerHTML=`<div class="cf-head"><b>${T('Файлы чата','Chat files')}</b><small>${ids.length} ${T(ids.length===1?'фото':'фото','photos')}</small></div><div class="cf-thumbs">${shown.map(id=>`<img src="${chatPhotoCache.get(id)}" alt="">`).join('')}${more>0?`<span class="cf-more">+${more}</span>`:''}</div>`;thread.prepend(card)}
    if((s.complete||s.urgency==='urgent')&&!thread.querySelector('.scout-rich')){const urgent=s.urgency==='urgent';
      const steps=urgent?[T('Не приближайтесь вплотную и держите безопасную дистанцию','Keep a safe distance'),T('Свяжитесь со специалистом','Contact a specialist'),T('Отправьте фото и место — без точного адреса','Send a photo and the area — no exact address'),T('Дождитесь ответа и обновите случай','Wait for a reply and update the case')]:[T('Сохраните карточку случая','Save the case card'),T('Найдите помощника рядом','Find a helper nearby'),T('Уточните приметы позже — можно без спешки','Add features later — no rush')];
      const art=document.createElement('article');art.className='guided-message scout-rich';art.innerHTML=`<small class="guided-author">${T('Скаут','Scout')}</small><p><b>${urgent?T('Давайте действовать спокойно и по шагам.','Let’s act calmly, step by step.'):T('Хорошо, этого достаточно для начала.','Good, that is enough to begin.')}</b></p><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol><div class="rich-actions">${urgent?`<button class="chip-btn on" data-go="emergency">${I('warning')}${T('Связаться','Contact')}</button>`:''}<button class="chip-btn" data-go="helpers">${I('search')}${T('Найти помощника','Find a helper')}</button>${s.complete&&!s.caseId?`<button class="chip-btn" data-v14="scout-save">${I('check')}${T('Сохранить в случай','Save to case')}</button>`:''}</div>`;thread.appendChild(art)}};

  /* ---------- Дополнения экранов ---------- */
  const settingsExtras=page=>{const access=page.querySelector('.account-access');if(!access||page.querySelector('.ts-card'))return;const s=S();
    const html=`<section class="card ts-card"><h3>${T('Размер текста','Text size')}</h3>${seg('ts',[['100','100%'],['115','115%'],['130','130%']],String(s.textScale),T('Размер текста','Text size'))}<p class="caption ts-sample">${T('Так выглядит основной текст.','This is how body text looks.')}</p></section>${locCard()}<section class="card">${sw('offline',T('Режим «без сети»','No-connection mode'),T('Показать режим без интернета','Show offline mode'),s.offline)}</section>`;
    access.insertAdjacentHTML('afterend',html);
    const tools=page.querySelector('.settings-tools');if(tools)tools.insertAdjacentHTML('beforeend',tile('bell',T('Уведомления','Notifications'),T('Тихие часы','Quiet hours'),'notifications')+tile('wifi',T('Без сети','Offline'),T('Памятки и 112','Guides and 112'),'offline')+tile('heart',T('Мой вклад','My impact'),T('Итоги и награды','Totals and awards'),'stats')+tile('photo',T('Истории','Stories'),T('С хорошим концом','Good endings'),'stories'))};
  const profileExtras=page=>{const grid=[...page.querySelectorAll('.account-grid')].pop();if(!grid||page.querySelector('[data-go="stats"]'))return;grid.insertAdjacentHTML('beforeend',tile('heart',T('Мой вклад','My impact'),T('Итоги и награды','Totals and awards'),'stats')+tile('photo',T('Истории','Stories'),T('С хорошим концом','Good endings'),'stories'))};
  const caseExtras=page=>{const stage=page.querySelector('.case-stage');if(!stage||page.querySelector('.ladder'))return;stage.insertAdjacentHTML('afterend',ladder(current()));
    const mini=page.querySelector('.mini-actions');if(mini&&!mini.querySelector('[data-go="team"]'))mini.insertAdjacentHTML('beforeend',`<button data-go="team" aria-label="${T('Команда случая','Case team')}">${I('user')}</button><button data-go="notifications" aria-label="${T('Уведомления','Notifications')}">${I('bell')}</button>`)};

  /* ---------- 20. Жесты ---------- */
  const TABS=['home','nearby','case','chats'];
  let sx=0,sy=0,st=0,sTarget=null;
  document.addEventListener('pointerdown',ev=>{sx=ev.clientX;sy=ev.clientY;st=Date.now();sTarget=ev.target},{passive:true});
  document.addEventListener('pointerup',ev=>{if(!sTarget||ev.pointerType==='mouse'&&ev.buttons)return;const dx=ev.clientX-sx,dy=ev.clientY-sy,t=sTarget;sTarget=null;
    if(Date.now()-st>600||Math.abs(dx)<72||Math.abs(dy)>Math.abs(dx)*.5)return;
    if(!t.closest||!t.closest('.scroll-content')||t.closest('input,textarea,select,.tab-filter,.panorama,[data-panorama-stage],.hub-filters,.guided-options,.chip-row,.map-surface,.map-gradient,.home-shortcuts'))return;
    let el=t;while(el&&el!==document.body){if(el.scrollWidth>el.clientWidth+4&&getComputedStyle(el).overflowX.match(/auto|scroll/))return;el=el.parentElement}
    const i=TABS.indexOf(tabFor(screen));if(i<0||!TABS.includes(screen))return;const ni=i+(dx<0?1:-1);if(ni<0||ni>=TABS.length)return;go(TABS[ni])},{passive:true});
  const parallax=page=>{const sc=page.querySelector('.scroll-content'),img=page.querySelector('.cg-well .animal-photo');if(!sc||!img||reduced())return;sc.addEventListener('scroll',()=>{img.style.setProperty('--py',Math.min(24,sc.scrollTop*.12)+'px')},{passive:true})};

  /* ---------- 21. Размер текста ---------- */
  const applyScale=()=>{const v=S().textScale;document.body.classList.remove('ts-115','ts-130');if(v>100)document.body.classList.add('ts-'+v)};

  /* ---------- Обработчики ---------- */
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-v14]');if(!b)return;const [a,...p]=b.dataset.v14.split(':'),s=S(),c=current();
    switch(a){
      case'loc':s.loc=p[0];persist();render();break;
      case'ts':s.textScale=+p[0];persist();applyScale();render();break;
      case'flyer':s.flyerFormat=p[0];persist();render();break;
      case'autofill':c.autofilled=true;addLog('Приметы подтверждены по подсказке Скаута','Features confirmed from Scout suggestion');persist();toast(T('Подтверждено. Поля ниже можно поправить.','Confirmed. You can still edit the fields below.'));
        {const col=document.getElementById('animal-color');if(col&&!col.value)col.value=COLORS()[c.color]||'';const f=document.getElementById('animal-features');if(f&&!f.value)f.value=c.features||''}render();break;
      case'autofill-edit':document.getElementById('animal-color')?.focus();break;
      case'owner-ask':{s.ownerAsk[c.id+':'+p[0]]=new Date().toISOString();addLog('Владельцу отправлен запрос подтвердить скрытую метку (локально)','Request to confirm the hidden mark sent to the owner (local)');persist();toast(T('Запрос отправлен локально. Метку называет владелец.','Request sent locally. The owner names the mark.'));render();break}
      case'flyer-copy':copyText(`${T('Найдено животное','Animal found')}: ${name(c)} #${c.number}. ${T('Примерный район','Approximate area')}: ${c.publicPlace}. ${T('Контакты и точная точка скрыты.','Contacts and exact location are hidden.')} ${flyerUrl(c)}`);break;
      case'fb':{const cur=s.feedback[c.id]||[];s.feedback[c.id]=cur.includes(p[0])?cur.filter(x=>x!==p[0]):[...cur,p[0]];persist();render();break}
      case'assign':{const r=ROLES().find(x=>x.id===p[0]),fit=helpers.filter(h=>r.types.includes(h.type)&&h.groups.includes(c.group)),cur=(s.team[c.id]||{})[r.id];
        openModal(r.n,T('Выберите помощника. Назначение — локальная заметка, запрос ему не отправляется.','Choose a helper. Assignment is a local note; no request is sent.'),
          (fit.length?fit.map(h=>`<button class="button ${cur===h.id?'':'secondary'}" data-v14="pick:${r.id}:${h.id}">${e(lang==='ru'?h.name:h.en)}</button>`).join(''):`<p class="caption">${T('Подходящих помощников для этой группы нет.','No suitable helpers for this group.')}</p>`)+(cur?`<button class="button ghost" data-v14="pick:${r.id}:-">${T('Снять назначение','Remove assignment')}</button>`:'')+`<button class="button ghost" data-v14="close-modal">${T('Закрыть','Close')}</button>`);break}
      case'pick':{const t=s.team[c.id]??={};const h=helpers.find(x=>x.id===p[1]),r=ROLES().find(x=>x.id===p[0]);if(p[1]==='-'){delete t[p[0]];addLog(`Снято назначение: ${RN[r.id][0]}`,`Assignment removed: ${RN[r.id][1]}`)}else{t[p[0]]=p[1];addLog(`Назначен(а) на роль «${RN[r.id][0]}»: ${h.name}`,`Assigned to “${RN[r.id][1]}”: ${h.en}`)}persist();closeModal();render();break}
      case'close-modal':closeModal();break;
      case'scout-save':saveGuided();break;
      case'notif':{s.read[p[0]]=true;persist();if(p[2])state.current=p[2];persist();go(p[1]);break}
      case'notif-demo':banner(T('Проверьте состояние животного','Check on the animal'),`${name(c)} #${c.number}`);break;
      case'share-stats':copyText(`${T('Подхват','Podhvat')}: ${T('закрыто случаев','cases closed')} ${closedCases().length}, ${T('в работе','in progress')} ${activeCases().length}. ${T('Адреса и контакты не публикуются.','Addresses and contacts are never published.')}`);break;
    }},true);
  document.addEventListener('change',ev=>{const i=ev.target.closest('[data-v14-toggle]');if(!i)return;const k=i.dataset.v14Toggle,s=S();
    if(k.startsWith('story-'))s.stories[k.slice(6)]=i.checked;else s[k]=i.checked;persist();if(k==='offline'||k==='quiet'||k==='onlyUrgent')render()});

  /* ---------- Подключение к render ---------- */
  const renderBefore=render;
  render=function(...a){const r=renderBefore.apply(this,a);applyScale();
    const page=app.querySelector('.screen:not(.screen-outgoing)');if(page){
      if(screen==='scout')scoutExtras(page);else if(screen==='settings')settingsExtras(page);else if(screen==='case'){caseExtras(page);parallax(page)}else if(screen==='home')parallax(page);
      netBanner(page)}
    return r};
  Object.assign(window.podhvat,{v14:{state:S,empty,skeleton,ring,banner,qrSvg,qrMatrix,ladder,urgencyScale}});
  render();
})();

/* ===== src/js/18-i18n-en.js ===== */
/* v14: английский для контента, который в прежних слоях был только на русском (памятки, помощники, каталог, вводные экраны,
   диалог Скаута). Точное совпадение текстового узла → перевод; личные имена пользователя не переводятся. */
(()=>{
  const EN={
    /* главная, маршрут, случаи */
    'Скаут · ваш помощник':'Scout · your assistant','Я рядом. Разберёмся шаг за шагом.':'I’m here. We’ll go step by step.','Попросить помощи':'Ask for help',
    'Следующий шаг · 3 / 5':'Next step · 3 / 5','Продолжить':'Continue','Новая находка':'New finding','Все случаи':'All cases','Маршрут помощи':'Help journey',
    'Все этапы вашего случая':'All stages of your case','Самопомощь':'Self-help','Короткие подсказки для разных случаев':'Short tips for different situations',
    'Можно начать с малого. Посмотреть, кому нужна помощь рядом.':'You can start small: see who needs help nearby.','Посмотреть рядом':'See nearby','Пропустить':'Skip',
    'Я Скаут.':'I’m Scout.','Я рядом.':'I’m here.','Если вы нашли животное, я помогу разобраться и выбрать следующий шаг.':'If you found an animal, I’ll help you sort things out and choose the next step.',
    'Давайте двигаться спокойно. Следующий шаг — ниже.':'Let’s move calmly. The next step is below.','Сейчас главное — ваша безопасность и связь со специалистом. Я помогу найти нужный контакт.':'What matters now is your safety and reaching a specialist. I’ll help find the right contact.',
    'Подхват':'Podhvat','Ваш случай':'Your case','Этап':'Stage','Помощники':'Helpers','Присутствие':'Presence','Рядом':'Nearby','Пять этапов · текущий подсвечен':'Five stages · current one highlighted',
    'Фото и приметы':'Photo and features','Задачи и договорённости':'Tasks and agreements','Возможные совпадения':'Possible matches','Зафиксировать итог':'Record the outcome',
    'Ваши действия уже стали частью этой истории.':'Your actions are already part of this story.','Назад':'Back','Скаут':'Scout',
    /* помощники и каталог */
    'Волонтёры':'Volunteers','Организации':'Organisations','Анна · волонтёр':'Anna · volunteer','Передержка':'Foster care','Помощь с временным размещением домашних животных.':'Help with temporary housing for domestic animals.',
    'Посмотреть карточку':'View card','Клиника «Рядом»':'Nearby clinic','Ветеринарная помощь':'Veterinary help','Ветеринарная помощь для домашних животных.':'Veterinary help for domestic animals.',
    'Центр помощи животным':'Animal support centre','Специалист':'Specialist','Профильная помощь домашним, диким и сельскохозяйственным животным.':'Specialist help for domestic, wild and farm animals.',
    'Илья · зоотакси':'Ilya · pet transport','Зоотакси':'Pet transport','Помощь с перевозкой домашних животных по согласованному маршруту.':'Help transporting domestic animals along an agreed route.',
    'Волонтёр':'Volunteer','Чем может помочь':'How they can help','Животные':'Animals','Ориентир':'Distance','1,2 км':'1.2 km','Условия':'Terms','Без оплаты':'No payment',
    'Готовность и время ответа пока не подтверждены.':'Availability and reply time are not confirmed yet.','Отвечает быстро':'Replies fast','Перед договорённостью':'Before you agree',
    'Срок и условия передержки согласуются в диалоге.':'Duration and terms of foster care are agreed in the conversation.','Запрос, подтверждение задачи и согласие на контакты — отдельные действия.':'Request, task confirmation and contact consent are separate actions.',
    'Запрос для случая #0241':'Request for case #0241','Отправить запрос':'Send request','В избранное':'Save','Обсудить со Скаутом':'Discuss with Scout','Сохранить услугу':'Save service','Все волонтёры':'All volunteers',
    'Стоимость, время и требования к перевозке нужно уточнить.':'Cost, time and transport requirements need to be confirmed.','Время приёма, стоимость и возможность принять животное уточняются отдельно.':'Appointment time, cost and ability to take the animal are confirmed separately.',
    'Вид животного и способ помощи согласуются со специалистом.':'The species and kind of help are agreed with the specialist.',
    'Люди, которые могут подхватить часть заботы.':'People who can take on part of the care.','Клиники и профильные службы для следующего шага.':'Clinics and specialist services for the next step.','Для случая':'For the case','Избранные':'Saved','Для случая #0241 · Domestic':'For case #0241 · Domestic',
    'Подобрать со Скаутом':'Match with Scout','Посмотреть на карте':'View on map',
    /* рядом, сцены */
    'Схема района':'Area diagram','Собака в парке':'Dog in the park','Осмотреть сцену 360°':'Explore 360° scene','#0319 · Собака в парке':'#0319 · Dog in the park','Нужна помощь':'Help needed',
    'Рыжая шерсть, светлая грудь. Примерная зона наблюдения, без точного адреса.':'Ginger fur, light chest. Approximate observation area, no exact address.','Посмотреть сцену 360°':'View 360° scene','Предложить помощь':'Offer help','Сохранить животное':'Save animal',
    'Сцена 360°':'360° scene','Окружение 3D':'3D surroundings','Проведите по экрану, чтобы осмотреться':'Swipe to look around','Окружение 360°':'Generated scene · approximate surroundings',
    /* Скаут (диалог) */
    'Я Скаут. Помогу разобраться и соберу ваши ответы в карточку случая.':'I’m Scout. I’ll help you sort things out and collect your answers into a case card.',
    'Начнём с безопасности. Вы сейчас можете наблюдать за животным с безопасного расстояния?':'Let’s start with safety. Can you watch the animal from a safe distance right now?',
    'Да, я в безопасности':'Yes, I’m safe','Нет, мне небезопасно':'No, it isn’t safe','Не уверен(а)':'I’m not sure','Подсказки':'Tips','Срочно':'Urgent','Фото':'Photo','Я волнуюсь':'I’m worried','Помощь рядом':'Help nearby',
    'Кого вы встретили?':'Who did you meet?','Собаку':'A dog','Кошку':'A cat','Дикое животное':'A wild animal','Сельскохозяйственное животное':'A farm animal','Не могу определить':'I can’t tell',
    'Что заметно со стороны? Не приближайтесь ради проверки.':'What can you see from a distance? Don’t approach just to check.','Двигается, явной травмы не вижу':'It moves, no visible injury','Вижу травму или необычное поведение':'I see an injury or unusual behaviour',
    'Не двигается / сильное кровотечение':'Not moving / heavy bleeding','Не могу оценить':'I can’t assess',
    'Где вы встретили животное? Достаточно района, парка или ориентира. Точный адрес останется приватным.':'Where did you meet the animal? A district, park or landmark is enough. The exact address stays private.',
    'Какие приметы вы заметили? Цвет, размер, ошейник — или напишите, что пока не можете рассмотреть.':'What features did you notice? Colour, size, collar — or say you can’t see well yet.',
    'Можете добавить фотографию, сделанную с безопасного расстояния? Если это небезопасно, пропустим.':'Can you add a photo taken from a safe distance? If it isn’t safe, we’ll skip it.','Добавить фото':'Add a photo','Пропустить фото':'Skip the photo',
    /* памятки: каталог */
    'Помощь рядом ':'Help nearby ','Короткие подсказки, когда важно понять следующий шаг.':'Short tips for when you need to understand the next step.','Все':'All','Кошка':'Cat','Хозяин':'Owner','Для вас':'For you','10 из 10 подсказок':'10 of 10 tips','1 мин':'1 min','2 мин':'2 min','1 мин чтения':'1 min read',
    'Все подсказки':'All tips','Сохранить статью':'Save article','Может пригодиться':'May come in handy','О подсказке и источниках':'About this tip and sources','Что можно сделать':'What you can do','Подсказки для разных случаев':'Tips for different situations',
    'Нашли животное. С чего начать?':'Found an animal. Where to start?','Первый шаг':'First step','Сначала — ваша безопасность. Не нужно решать всё сразу.':'Your safety comes first. You don’t have to solve everything at once.',
    'Останьтесь в безопасном месте':'Stay in a safe place','Наблюдайте со стороны. Не выходите на проезжую часть и не приближайтесь ради проверки.':'Watch from a distance. Don’t step onto the road or approach just to check.',
    'Запишите то, что видно':'Note what you can see','Вид животного, приметы и примерный район. Ответ «не знаю» лучше догадки.':'The species, features and approximate area. “I don’t know” is better than a guess.',
    'Выберите следующий шаг':'Choose the next step','Если видите травму или не можете оценить состояние, свяжитесь с ветеринарной или профильной службой. Иначе начните карточку случая.':'If you see an injury or can’t judge the condition, contact a veterinary or specialist service. Otherwise start a case card.',
    'Не пытайтесь удерживать испуганное животное. Согласуйте действия со специалистом.':'Don’t try to hold a frightened animal. Agree your actions with a specialist.','RSPCA · найденная собака':'RSPCA · found dog',
    'Вижу травму. Что дальше?':'I see an injury. What next?','При видимой травме чтение памятки не должно откладывать обращение за помощью.':'With a visible injury, reading this guide should not delay asking for help.',
    'Сохраните дистанцию':'Keep your distance','Испуганное или травмированное животное может защищаться. Не приближайтесь ради осмотра.':'A frightened or injured animal may defend itself. Don’t approach to examine it.',
    'Свяжитесь со специалистом':'Contact a specialist','Опишите видимые признаки и место. Для домашнего животного — ветеринарная служба, для дикого — профильный специалист.':'Describe the visible signs and the place. For a domestic animal, a veterinary service; for a wild one, a specialist.',
    'Следуйте согласованным указаниям':'Follow the agreed instructions','Не назначайте лекарства и не пытайтесь лечить самостоятельно. Уточните, кто готов помочь и куда можно обратиться.':'Don’t give medicine or try to treat the animal yourself. Find out who can help and where to go.',
    'Если опасность угрожает людям, обратитесь в местную экстренную службу. Скаут не ставит диагноз.':'If there is a danger to people, call the local emergency service. Scout does not diagnose.','RSPCA · помощь травмированным животным':'RSPCA · helping injured animals',
    'Кошка во дворе — потерялась?':'A cat in the yard — is it lost?','Кошка на улице может иметь дом. Одного наблюдения недостаточно, чтобы считать её бездомной.':'A cat outdoors may have a home. Observation alone is not enough to call it a stray.',
    'Посмотрите со стороны':'Watch from a distance','Запишите приметы и место. Не пытайтесь поймать кошку только ради проверки.':'Note the features and the place. Don’t try to catch the cat just to check.',
    'Проверьте объявления':'Check the notices','Сравните сообщения о пропаже и спросите соседей, знакомо ли им животное. Не публикуйте точные личные контакты.':'Compare missing-pet reports and ask neighbours if they know the animal. Don’t publish exact personal contacts.',
    'Уточните проверку чипа':'Ask about a chip check','Ветеринарная служба может помочь с проверкой микрочипа. Сначала согласуйте безопасные действия и возможность приёма.':'A veterinary service can help check for a microchip. First agree safe actions and whether they can take the animal.',
    'Если видите травму или кошка выглядит неблагополучно, обратитесь к специалисту, не дожидаясь результата поиска.':'If you see an injury or the cat looks unwell, contact a specialist without waiting for search results.','Blue Cross · найденная кошка':'Blue Cross · found cat',
    'Дикое животное рядом':'A wild animal nearby','Наблюдать издалека':'Observe from afar','Для диких и сельскохозяйственных животных нужен профильный специалист.':'Wild and farm animals need a specialist.',
    'Не приближайтесь':'Don’t approach','Наблюдайте из безопасного места. Не пытайтесь поймать, поднять или самостоятельно перевезти животное.':'Watch from a safe place. Don’t try to catch, lift or transport the animal yourself.',
    'Сохраните ориентир':'Remember the landmark','Запишите район, заметное место и видимые признаки. Фото — только если его можно сделать безопасно.':'Note the district, a recognisable place and visible signs. Take a photo only if it is safe.',
    'Найдите профильную службу':'Find a specialist service','Передайте наблюдения специалисту по этому виду животных. Дальнейшие действия согласуйте с ним.':'Pass your observations to a specialist for this species and agree further actions with them.',
    'Присутствие помощника на карте не означает, что он имеет опыт работы с этим видом или готов принять животное.':'A helper shown on the map does not mean they have experience with this species or can take the animal.','RSPCA · дикие животные':'RSPCA · wild animals',
    'Как проверить владельца?':'How to verify an owner?','Поиск хозяина':'Finding the owner','Похожая фотография — повод проверить сведения, а не подтверждение владения.':'A similar photo is a reason to check details, not proof of ownership.',
    'Сравните приметы':'Compare the features','Попросите фотографии, сделанные до находки, и описание отличительных признаков. Часть примет оставьте для проверки.':'Ask for photos taken before the find and a description of distinctive marks. Keep some marks back for verification.',
    'Уточните подтверждения':'Ask for confirmation','Документы, номер чипа и сведения из реестра помогают проверить связь человека с животным. Сомнения обсудите со специалистом.':'Documents, the chip number and registry data help verify the person’s link to the animal. Discuss doubts with a specialist.',
    'Согласуйте передачу':'Agree the handover','Сначала подтвердите сведения и безопасный способ встречи. В приложении контакты раскрываются только по отдельному согласию.':'First confirm the details and a safe way to meet. In the app, contacts open only with separate consent.',
    'Не отправляйте личные документы в публичные объявления. Не передавайте животное только на основании совпадения в поиске.':'Don’t post personal documents in public notices. Don’t hand over the animal on a search match alone.','Blue Cross · микрочип и идентификация':'Blue Cross · microchip and identification',
    'Фото, которое поможет поиску':'A photo that helps the search','Приметы':'Features','Покажите заметные приметы, сохраняя безопасную дистанцию.':'Show distinctive features while keeping a safe distance.',
    'Не приближайтесь ради кадра':'Don’t approach for the shot','Используйте увеличение, если оно доступно. Если фото небезопасно, пропустите его и опишите наблюдение.':'Use zoom if available. If a photo isn’t safe, skip it and describe what you saw.',
    'Проверьте, что видно':'Check what is visible','Для карточки полезны общий вид, цвет, размер и заметные особенности. Не дорисовывайте и не меняйте приметы на фото.':'The overall look, colour, size and distinctive features help. Don’t retouch or alter the features in the photo.',
    'Уберите лишние данные':'Remove extra data','Перед публикацией проверьте, нет ли чужих лиц, номеров телефонов и точного приватного адреса.':'Before publishing, check for other people’s faces, phone numbers and an exact private address.',
    'В прототипе фото сохраняются локально. Публикация карточки — отдельное действие.':'Publishing the card is a separate action.',
    'Временная забота без риска':'Temporary care without risk','Готовность помочь и возможность безопасной передержки — разные вещи.':'Willingness to help and the ability to foster safely are different things.',
    'Уточните условия':'Confirm the conditions','Обсудите со специалистом вид животного, его состояние и подходящие условия размещения.':'Discuss the species, its condition and suitable housing with a specialist.',
    'Согласуйте помощь':'Agree on help','Уточните, кто принимает животное, где и на какой срок. Предложение помощи ещё не означает подтверждённый приём.':'Find out who takes the animal, where and for how long. An offer of help is not a confirmed intake.',
    'Обсудите уход':'Discuss the care','Кормление и уход зависят от вида и состояния. Получите подходящие указания ветеринара; не назначайте лекарства.':'Feeding and care depend on the species and condition. Get suitable instructions from a vet; don’t give medicine.',
    'Для дикого или сельскохозяйственного животного выбирайте профильную службу. Эта памятка не инструкция по лечению.':'For a wild or farm animal choose a specialist service. This guide is not treatment instructions.',
    'Животное защищается':'The animal is defending itself','Безопасность':'Safety','Не нужно проверять, получится ли подойти ближе.':'There’s no need to test whether you can get closer.',
    'Остановите попытку контакта':'Stop trying to make contact','Останьтесь на расстоянии. Не провоцируйте животное и не пытайтесь удержать его.':'Stay at a distance. Don’t provoke the animal or try to hold it.',
    'Предупредите о ситуации':'Report the situation','Сообщите специалисту о поведении и месте. Не направляйте неподготовленного помощника на самостоятельный захват.':'Tell the specialist about the behaviour and the place. Don’t send an untrained helper to capture it.',
    'При травме человека обратитесь за помощью':'If a person is hurt, get help','Если человек укушен или травмирован, обратитесь за медицинской помощью. При непосредственной угрозе — в местную экстренную службу.':'If a person is bitten or injured, seek medical help. In immediate danger, call the local emergency service.',
    'Поведение не позволяет поставить диагноз. Безопасность людей важнее сбора подробностей.':'Behaviour does not allow a diagnosis. People’s safety matters more than collecting details.',
    'Я волнуюсь. Один шаг за раз':'I’m worried. One step at a time','Не нужно знать все ответы заранее. Можно сделать паузу и попросить помощи.':'You don’t need to know all the answers in advance. You can pause and ask for help.',
    'Выберите безопасное место':'Choose a safe place','Не оставайтесь рядом с животным из чувства обязанности, если вам небезопасно.':'Don’t stay near the animal out of duty if it isn’t safe for you.',
    'Разделите задачу':'Split the task','Сейчас достаточно одного действия: записать ориентир, сообщить специалисту или описать Скауту то, что видно.':'One action is enough for now: note a landmark, tell a specialist or describe to Scout what you see.',
    'Подключите поддержку':'Bring in support','Попросите человека, которому доверяете, помочь с организацией. Скаут сохранит ход разговора — можно вернуться позже.':'Ask someone you trust to help organise. Scout keeps the conversation so you can come back later.',
    'Эта подсказка для поддержки в ситуации, а не замена профессиональной помощи.':'This tip is for support in the moment, not a replacement for professional help.',
    'Мой питомец пропал':'My pet is missing','Поиск':'Search','Соберите понятное описание и проверяйте сообщения о находках.':'Prepare a clear description and check reports of finds.',
    'Подготовьте сведения':'Prepare the details','Выберите свежую фотографию, запишите приметы, последний известный район и время наблюдения.':'Choose a recent photo and note the features, the last known district and the time seen.',
    'Сообщите о пропаже':'Report the loss','Проверьте местные группы и службы. Если питомец чипирован, уведомите реестр, в котором зарегистрирован чип.':'Check local groups and services. If the pet is chipped, notify the registry where the chip is registered.',
    'Проверяйте возможные находки':'Check possible finds','Сопоставляйте особые приметы и фотографии. Уточняйте сведения до встречи и передачи персональных данных.':'Compare distinctive marks and photos. Confirm details before meeting or sharing personal data.',
    'Публичное объявление не должно раскрывать лишние приватные данные. Не считайте неподтверждённое сообщение установленным фактом.':'A public notice should not reveal extra private data. Don’t treat an unconfirmed report as established fact.','Blue Cross · поиск пропавшей кошки':'Blue Cross · finding a lost cat',
    /* избранное, вводные */
    'Избранное':'Saved','Полезные контакты и материалы — под рукой.':'Useful contacts and materials at hand.','Услуги':'Services','Статьи':'Articles','Сохраните то, что пригодится':'Save what will come in handy',
    'Нажмите сердце в карточке помощника или сохраните полезную статью.':'Tap the heart on a helper’s card or save a useful article.','Посмотреть волонтёров':'See volunteers','Выбрать организацию':'Choose an organisation',
    'Помощь начинается с одного шага':'Help starts with one step','Один случай.':'One case.','Один маршрут.':'One route.','Оценим ситуацию, сохраним приметы и найдём помощь. При срочности сразу перейдём к специалисту.':'We’ll assess the situation, save the features and find help. If it’s urgent we go straight to a specialist.',
    'Помогаем.':'We help.','Бережно.':'Carefully.','Точная точка и контакты остаются приватными. Вы сами решаете, кому и когда их открыть.':'The exact spot and contacts stay private. You decide whom to open them to and when.',
    /* данные демо */
    'Собака в парке ':'Dog in the park ','Городской парк':'City park','Жилой квартал':'Residential block','Зелёный двор':'Green courtyard','Луг у деревни':'Meadow by the village','Лошадь на лугу':'Horse in the meadow','Кошка во дворе':'Cat in the yard',
    'Рыжая шерсть, светлая грудь':'Ginger fur, light chest','Серая полосатая шерсть':'Grey tabby fur','Коричневая шерсть':'Brown fur',
    'Первый подхват':'First catch','Опубликовать случай с подтверждёнными данными':'Publish a case with confirmed data','Помощь согласована':'Help agreed','Получить подтверждение задачи от помощника':'Get task confirmation from a helper','История сохранена':'Story saved','Закрыть случай с указанным итогом':'Close a case with a stated outcome',
    'Собака':'Dog','рыжий / бежевый':'ginger / beige','Белая грудь':'White chest','Белые лапы':'White paws',
    'Нашли животное. С чего начать? ':'Found an animal. Where to start? ','Вижу травму. Что дальше? ':'I see an injury. What next? '
  };
  const TOKENS=[[/Примерный район/g,'Approximate district'],[/Городской парк/g,'City park'],[/Жилой квартал/g,'Residential block'],[/Рыжий пёс/g,'Sandy dog'],[/Собака в парке/g,'Dog in the park']];
  const ATTRS=['aria-label','title','alt','placeholder'];
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const MAP=new Map(Object.entries(EN).map(([k,v])=>[k.replace(/\s+/g,' ').trim(),v]));
  const tr=s=>{const n=norm(s);if(MAP.has(n))return s.replace(n,MAP.get(n));let out=s;for(const [re,t] of TOKENS)out=out.replace(re,t);return out};
  function translate(root){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const nodes=[];while(n=w.nextNode())nodes.push(n);
    for(const t of nodes){if(!/[А-Яа-яЁё]/.test(t.nodeValue))continue;const v=tr(t.nodeValue);if(v!==t.nodeValue)t.nodeValue=v}
    root.querySelectorAll('*').forEach(el=>{for(const a of ATTRS){const v=el.getAttribute(a);if(v&&/[А-Яа-яЁё]/.test(v)){const x=tr(v);if(x!==v)el.setAttribute(a,x)}}})}
  const renderBefore=render;
  render=function(...a){const r=renderBefore.apply(this,a);
    if(lang==='en'){const page=app.querySelector('.screen:not(.screen-outgoing)');if(page)translate(page)}return r};
  window.podhvat.i18n={dictionary:EN,translate};
  render();
})();

/* ===== src/js/19-v15-art.js ===== */
/* 19 · v15: иллюстрации помощников (аватары, обложки, логотипы, товары).
   Генерируются как SVG в стиле приложения; фотореалистичные кадры подставляются
   тем же путём (поле photo/avatar в ART) — см. ASSET-PROMPTS.md. */
const ART=(()=>{
  const enc=s=>'data:image/svg+xml;utf8,'+encodeURIComponent(s);
  const grad=(id,a,b,v)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${v?0:1}" y2="${v?1:1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

  /* ---- Люди ---- */
  const PEOPLE={
    v1:{bg:['#F6E3D3','#EFC7AE'],skin:'#F0C7A4',hair:'#6A432C',shirt:'#658592',style:'long'},
    v2:{bg:['#DCE8EC','#BFD3DA'],skin:'#C99A74',hair:'#241A15',shirt:'#263D4A',style:'short',beard:true,cap:'#DBF95B'},
    v3:{bg:['#F3E4EA','#E8C6D2'],skin:'#F4D2B6',hair:'#B4552D',shirt:'#8A6F9E',style:'bun'},
    v4:{bg:['#E5EFD7','#CFE2B3'],skin:'#E7B997',hair:'#8D9296',shirt:'#3F5B49',style:'short',glasses:true}
  };
  function person(o,id){
    const g=o.style==='long'?`<path d="M44 84c-6-44 16-62 36-62s42 18 36 62c-1 20 6 30 4 40H40c-2-10 5-20 4-40z" fill="${o.hair}"/>`:'';
    const bun=o.style==='bun'?`<circle cx="80" cy="26" r="15" fill="${o.hair}"/>`:'';
    const fringe=o.style==='long'?`<path d="M49 72c2-28 18-38 31-38s29 10 31 38c-10-13-21-19-31-19s-21 6-31 19z" fill="${o.hair}"/>`
      :`<path d="M49 74c-3-30 14-44 31-44s34 14 31 44c-6-11-15-17-31-17s-25 6-31 17z" fill="${o.hair}"/>`;
    const beard=o.beard?`<path d="M53 82c0 32 54 32 54 0-6 15-19 22-27 22s-21-7-27-22z" fill="${o.hair}"/>`:'';
    const cap=o.cap?`<path d="M48 62c2-24 16-34 32-34s30 10 32 34z" fill="${o.cap}"/><path d="M44 62h50c8 0 12 3 14 6H44z" fill="${o.cap}" opacity=".85"/>`:'';
    const glasses=o.glasses?`<g fill="none" stroke="#17191B" stroke-width="2.4"><circle cx="67" cy="78" r="9"/><circle cx="93" cy="78" r="9"/><path d="M76 78h8"/></g>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs>${grad('b'+id,o.bg[0],o.bg[1],1)}</defs><rect width="160" height="160" fill="url(#b${id})"/><circle cx="130" cy="26" r="40" fill="#fff" opacity=".28"/>${g}<path d="M16 160c0-36 28-54 64-54s64 18 64 54z" fill="${o.shirt}"/><path d="M62 108l18 20 18-20z" fill="#fff" opacity=".18"/><rect x="68" y="90" width="24" height="26" rx="11" fill="${o.skin}" style="filter:brightness(.92)"/><ellipse cx="80" cy="76" rx="30" ry="34" fill="${o.skin}"/>${beard}${bun}${fringe}${cap}<circle cx="68" cy="78" r="2.8" fill="#2A2320"/><circle cx="92" cy="78" r="2.8" fill="#2A2320"/>${glasses}<path d="M71 93q9 7 18 0" fill="none" stroke="#2A2320" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="88" r="5" fill="#E58C7C" opacity=".28"/><circle cx="100" cy="88" r="5" fill="#E58C7C" opacity=".28"/></svg>`;
  }

  /* ---- Логотипы организаций ---- */
  const ORGS={
    o1:{bg:'#2F8F6B',sym:'cross'},o2:{bg:'#263D4A',sym:'shield'},
    o3:{bg:'#D9732B',sym:'house'},o4:{bg:'#17191B',sym:'paw'}
  };
  const SYM={
    cross:'<rect x="66" y="42" width="28" height="76" rx="9" fill="#fff"/><rect x="42" y="66" width="76" height="28" rx="9" fill="#fff"/>',
    shield:'<path d="M80 38l34 14v26c0 22-15 38-34 46-19-8-34-24-34-46V52z" fill="#fff"/><path d="M64 80l11 11 21-24" fill="none" stroke="#263D4A" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
    house:'<path d="M80 38L42 70v46h76V70z" fill="#fff"/><path d="M80 108c-14-9-20-16-20-24 0-8 6-12 11-12 4 0 7 2 9 5 2-3 5-5 9-5 5 0 11 4 11 12 0 8-6 15-20 24z" fill="#D9732B"/>',
    paw:'<ellipse cx="80" cy="102" rx="24" ry="19" fill="#DBF95B"/><ellipse cx="50" cy="76" rx="9" ry="12" fill="#DBF95B" transform="rotate(-18 50 76)"/><ellipse cx="68" cy="58" rx="9" ry="13" fill="#DBF95B"/><ellipse cx="92" cy="58" rx="9" ry="13" fill="#DBF95B"/><ellipse cx="110" cy="76" rx="9" ry="12" fill="#DBF95B" transform="rotate(18 110 76)"/>'
  };
  const logo=id=>{const o=ORGS[id];return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${o.bg}"/><circle cx="130" cy="20" r="46" fill="#fff" opacity=".12"/>${SYM[o.sym]}</svg>`};

  /* ---- Обложки ---- */
  const sky=(id,a,b)=>`<defs>${grad('s'+id,a,b,1)}</defs><rect width="640" height="320" fill="url(#s${id})"/>`;
  const tree=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="0" width="10" height="46" rx="4" fill="#7A5A44"/><circle cx="0" cy="-8" r="32" fill="${c}"/><circle cx="-20" cy="10" r="22" fill="${c}"/><circle cx="20" cy="10" r="22" fill="${c}"/></g>`;
  const store=(id,o)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice">${sky(id,o.sky[0],o.sky[1])}<circle cx="520" cy="62" r="34" fill="#fff" opacity=".7"/><ellipse cx="140" cy="70" rx="56" ry="16" fill="#fff" opacity=".75"/><ellipse cx="176" cy="60" rx="38" ry="14" fill="#fff" opacity=".75"/>${tree(66,206,1,o.leaf)}${tree(584,214,.9,o.leaf)}<rect y="262" width="640" height="58" fill="${o.ground}"/><rect y="262" width="640" height="6" fill="#000" opacity=".06"/><rect x="150" y="104" width="340" height="164" rx="6" fill="${o.wall}"/><rect x="138" y="92" width="364" height="22" rx="6" fill="${o.roof}"/><path d="M158 114h324l-14 40H172z" fill="${o.awn}"/><path d="${[0,1,2,3,4,5].map(i=>`M${158+i*54} 114h27l-${2+i*0}.0 40h-27z`).join('')}" fill="#fff" opacity=".35" transform="translate(0 0)"/><rect x="176" y="168" width="106" height="66" rx="8" fill="${o.glass}"/><rect x="176" y="168" width="106" height="66" rx="8" fill="#fff" opacity=".22"/><rect x="368" y="168" width="96" height="100" rx="8" fill="${o.door}"/><circle cx="378" cy="222" r="4" fill="#fff"/><rect x="298" y="168" width="54" height="66" rx="8" fill="${o.glass}"/><g transform="translate(325 202) scale(.18) translate(-80 -80)">${o.sym}</g><rect x="262" y="248" width="28" height="20" rx="4" fill="${o.pot}"/><circle cx="276" cy="240" r="12" fill="${o.leaf}"/></svg>`;
  const SCENES={
    o1:()=>store('o1',{sky:['#CFE6F2','#EAF4F1'],leaf:'#8CBF8A',ground:'#CDD8CD',wall:'#F6F7F2',roof:'#2F8F6B',awn:'#2F8F6B',glass:'#B9D8E6',door:'#2F8F6B',pot:'#C98F6B',sym:SYM.cross.replace(/#fff/g,'#2F8F6B')}),
    o2:()=>store('o2',{sky:['#D4DEE6','#EEF1F2'],leaf:'#7FA58F',ground:'#CBD3D5',wall:'#E9EEF0',roof:'#263D4A',awn:'#4B6A7A',glass:'#A9C2CE',door:'#263D4A',pot:'#B38A6B',sym:SYM.shield.replace(/#fff/g,'#263D4A').replace('stroke="#263D4A"','stroke="#fff"')}),
    o3:()=>store('o3',{sky:['#FBE3C6','#FFF4E3'],leaf:'#9CBF7B',ground:'#D9CDB6',wall:'#FFF3E1',roof:'#B8591C',awn:'#D9732B',glass:'#F4D6A9',door:'#B8591C',pot:'#C98F6B',sym:SYM.house.replace(/#fff/g,'#D9732B').replace('fill="#D9732B"/>','fill="#fff"/>')}),
    o4:()=>store('o4',{sky:['#E3EBD0','#F4F8E8'],leaf:'#8DB270',ground:'#D5D9C9',wall:'#FAFBF5',roof:'#17191B',awn:'#17191B',glass:'#C8D6B4',door:'#17191B',pot:'#B38A6B',sym:SYM.paw.replace(/#DBF95B/g,'#17191B')}),
    v1:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice"><rect width="640" height="320" fill="#F4E6D6"/><rect y="238" width="640" height="82" fill="#D8B896"/><rect x="396" y="46" width="170" height="130" rx="10" fill="#CFE6F2"/><path d="M481 46v130M396 111h170" stroke="#fff" stroke-width="6"/><circle cx="450" cy="86" r="16" fill="#fff" opacity=".7"/><rect x="60" y="164" width="260" height="92" rx="26" fill="#658592"/><rect x="48" y="146" width="284" height="48" rx="24" fill="#7A9AA7"/><rect x="86" y="170" width="70" height="40" rx="14" fill="#fff" opacity=".18"/><ellipse cx="470" cy="272" rx="70" ry="22" fill="#E7C9A3"/><ellipse cx="470" cy="262" rx="52" ry="16" fill="#F6E7D0"/><ellipse cx="470" cy="248" rx="26" ry="20" fill="#E8A86B"/><path d="M450 234l6-18 12 12zM490 234l-6-18-12 12z" fill="#E8A86B"/><circle cx="462" cy="246" r="2.5" fill="#2A2320"/><circle cx="478" cy="246" r="2.5" fill="#2A2320"/><rect x="560" y="196" width="40" height="46" rx="8" fill="#B38A6B"/><circle cx="580" cy="186" r="24" fill="#8CBF8A"/><circle cx="560" cy="200" r="16" fill="#8CBF8A"/></svg>`,
    v2:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice">${sky('v2','#D6E4EC','#F0F4F2')}<rect y="236" width="640" height="84" fill="#9AA5A9"/><path d="M0 286h640" stroke="#fff" stroke-width="5" stroke-dasharray="36 28" opacity=".7"/><rect y="226" width="640" height="14" fill="#C7CFCF"/>${tree(70,170,.9,'#8CBF8A')}<g><rect x="190" y="170" width="290" height="80" rx="30" fill="#DBF95B"/><path d="M236 172l36-52h112l50 52z" fill="#CBEA39"/><path d="M252 170l28-40h46v40zM338 170v-40h42l36 40z" fill="#CFE6F2"/><rect x="476" y="206" width="14" height="18" rx="5" fill="#17191B" opacity=".4"/><circle cx="262" cy="252" r="30" fill="#17191B"/><circle cx="262" cy="252" r="13" fill="#D5DADB"/><circle cx="420" cy="252" r="30" fill="#17191B"/><circle cx="420" cy="252" r="13" fill="#D5DADB"/><rect x="330" y="150" width="60" height="30" rx="8" fill="#263D4A" opacity=".0"/><circle cx="350" cy="152" r="0" fill="#fff"/></g><rect x="520" y="178" width="70" height="56" rx="12" fill="#658592"/><path d="M536 178v-10h38v10" fill="none" stroke="#263D4A" stroke-width="6" stroke-linecap="round"/><ellipse cx="555" cy="206" rx="14" ry="12" fill="#E8A86B"/></svg>`,
    v3:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice">${sky('v3','#E2EFD7','#F7FAEC')}<circle cx="110" cy="64" r="30" fill="#FBE59A"/><rect y="236" width="640" height="84" fill="#9CC57F"/><path d="M0 252c120-18 220-18 330 0s220 18 310 0v68H0z" fill="#8DB86F"/>${[0,1,2,3,4,5,6,7,8,9,10].map(i=>`<rect x="${14+i*58}" y="170" width="30" height="86" rx="10" fill="#fff"/><path d="M${14+i*58} 176l15-14 15 14z" fill="#fff"/>`).join('')}<rect x="0" y="198" width="640" height="12" fill="#F1ECE2"/><rect x="0" y="228" width="640" height="10" fill="#F1ECE2"/><g transform="translate(400 116)"><rect x="0" y="40" width="130" height="90" rx="6" fill="#D9732B"/><path d="M-12 46L65-6l77 52z" fill="#B8591C"/><path d="M38 130V84a27 27 0 0 1 54 0v46z" fill="#5C3A22"/></g><ellipse cx="260" cy="270" rx="44" ry="26" fill="#E8C9A0"/><circle cx="224" cy="252" r="20" fill="#E8C9A0"/><path d="M210 242l-6-22 18 8zM238 238l6-22-18 8z" fill="#B88B5E"/><circle cx="217" cy="250" r="2.6" fill="#2A2320"/><circle cx="231" cy="250" r="2.6" fill="#2A2320"/><ellipse cx="224" cy="258" rx="6" ry="4" fill="#2A2320"/></svg>`,
    v4:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice">${sky('v4','#D4E6EE','#EEF6EE')}<ellipse cx="120" cy="64" rx="60" ry="16" fill="#fff" opacity=".8"/><ellipse cx="520" cy="84" rx="54" ry="14" fill="#fff" opacity=".8"/><path d="M0 220c120-30 240-30 360-8s200 8 280-10v118H0z" fill="#A9CF8B"/><path d="M250 320c20-50 60-80 110-96 40-12 90-14 150-6v102z" fill="#E9DCC5"/>${tree(84,150,1.3,'#7FB07A')}${tree(540,138,1.5,'#6FA36E')}${tree(300,170,.8,'#8DBB86')}<g transform="translate(120 238)"><rect width="110" height="12" rx="6" fill="#8A6A52"/><rect x="6" y="-30" width="98" height="10" rx="5" fill="#8A6A52"/><rect x="12" y="12" width="8" height="26" fill="#5C4636"/><rect x="90" y="12" width="8" height="26" fill="#5C4636"/><rect x="14" y="-20" width="6" height="20" fill="#5C4636"/><rect x="90" y="-20" width="6" height="20" fill="#5C4636"/></g><g transform="translate(430 120)"><rect x="-3" y="0" width="6" height="110" fill="#263D4A"/><circle cx="0" cy="-4" r="14" fill="#FFF3B5"/></g><rect x="388" y="286" width="46" height="20" rx="10" fill="#DBF95B"/><path d="M398 270l18-36 18 36z" fill="#DBF95B" opacity="0"/></svg>`
  };

  /* ---- Товары первой необходимости ---- */
  const tile=(bg,body)=>enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/>${body}</svg>`);
  const PROD={
    bowl:tile('#E9F2DA','<ellipse cx="60" cy="86" rx="38" ry="8" fill="#000" opacity=".08"/><path d="M24 62h72c0 22-14 30-36 30S24 84 24 62z" fill="#658592"/><ellipse cx="60" cy="62" rx="36" ry="9" fill="#8DAAB6"/><ellipse cx="60" cy="62" rx="28" ry="6" fill="#C7A27A"/>'),
    food:tile('#FBEBD2','<ellipse cx="60" cy="98" rx="34" ry="6" fill="#000" opacity=".08"/><path d="M32 30h56l6 66H26z" fill="#D9732B"/><path d="M32 30h56l-4 14H36z" fill="#B8591C"/><circle cx="60" cy="68" r="15" fill="#FBEBD2"/><path d="M52 72c4-12 12-12 16 0z" fill="#D9732B"/>'),
    carrier:tile('#E1ECF1','<ellipse cx="60" cy="98" rx="36" ry="6" fill="#000" opacity=".08"/><rect x="24" y="44" width="72" height="50" rx="12" fill="#263D4A"/><rect x="32" y="52" width="40" height="34" rx="8" fill="#DBE5E9"/><path d="M42 52v34M52 52v34M62 52v34" stroke="#263D4A" stroke-width="3"/><path d="M42 44c0-14 36-14 36 0" fill="none" stroke="#17191B" stroke-width="6" stroke-linecap="round"/><rect x="78" y="58" width="12" height="22" rx="5" fill="#658592"/>'),
    leash:tile('#F4F0DA','<circle cx="60" cy="58" r="30" fill="none" stroke="#DBF95B" stroke-width="9"/><circle cx="60" cy="58" r="30" fill="none" stroke="#17191B" stroke-width="2" opacity=".15"/><path d="M82 80l16 20" stroke="#DBF95B" stroke-width="9" stroke-linecap="round"/><rect x="90" y="92" width="14" height="14" rx="4" fill="#17191B"/><circle cx="34" cy="40" r="6" fill="#17191B"/>'),
    blanket:tile('#EEE6F2','<ellipse cx="60" cy="94" rx="40" ry="6" fill="#000" opacity=".07"/><path d="M20 44h80l-8 46H28z" fill="#8A6F9E"/><path d="M20 44h80l-3 14H23z" fill="#A58BB8"/><path d="M38 62v26M60 62v28M82 62v26" stroke="#fff" stroke-width="3" opacity=".35"/>'),
    kit:tile('#F9E3E1','<ellipse cx="60" cy="96" rx="34" ry="6" fill="#000" opacity=".07"/><rect x="26" y="40" width="68" height="50" rx="12" fill="#fff"/><path d="M48 40v-6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v6" fill="none" stroke="#B33040" stroke-width="5"/><rect x="54" y="52" width="12" height="28" rx="4" fill="#B33040"/><rect x="46" y="60" width="28" height="12" rx="4" fill="#B33040"/>'),
    litter:tile('#E6EFE2','<ellipse cx="60" cy="98" rx="38" ry="6" fill="#000" opacity=".07"/><path d="M22 58h76l-6 36H28z" fill="#658592"/><path d="M22 58h76l-2 12H24z" fill="#8DAAB6"/><path d="M34 54c8-10 14-4 22-12 6 6 16 0 28 12z" fill="#D9CDB6"/>'),
    water:tile('#DDEEF5','<ellipse cx="60" cy="98" rx="26" ry="5" fill="#000" opacity=".07"/><rect x="44" y="26" width="32" height="68" rx="14" fill="#8EC5DB"/><rect x="50" y="16" width="20" height="14" rx="5" fill="#263D4A"/><rect x="44" y="52" width="32" height="42" rx="14" fill="#5FA9C6"/>')
  };

  const cache={};
  const get=(kind,id)=>cache[kind+id]??=enc(kind==='avatar'?(PEOPLE[id]?person(PEOPLE[id],id):logo(id)):SCENES[id]?.()||'');
  /* Фотографии: положите файл в assets/photos/ и впишите имя без расширения сюда.
     Пока имени нет в списке, показывается иллюстрация. Форматы: .webp. */
  const PHOTOS=new Set([]);
  const photo=n=>PHOTOS.has(n)?'assets/photos/'+n+'.webp':null;
  return {avatar:id=>photo(id+'-avatar')||get('avatar',id),cover:id=>photo(id+'-cover')||get('cover',id),prod:k=>photo('product-'+k)||PROD[k]||PROD.bowl,kinds:Object.keys(PROD),photos:PHOTOS};
})();

/* ===== src/js/20-v15.js ===== */
/* v15: продуктовое ревью — главная со Скаутом по центру, помощники с аватарами/обложками/
   ачивками/услугами/каталогом, разгрузка списков, плавные переходы вкладок снизу вверх. */
(()=>{
  const S=()=>{state.v15??={};state.v15.wants??={};return state.v15};
  const reduced=()=>document.body.classList.contains('reduce-motion')||state.prefs?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Данные помощников ---------- */
  const add=(h,meta)=>{if(!helpers.some(x=>x.id===h.id))helpers.push(h);helperMeta[h.id]??=meta};
  add({id:'v3',name:'Марина · кинолог',en:'Marina · dog handler',kind:'person',tag:'Передержка собак',tagEN:'Dog foster',distance:'2,2',type:'foster',groups:['domestic'],rating:'4,9',price:0},
      {about:'Принимает собак на передержку и подсказывает, как вести себя с напуганным животным.',icon:'home',terms:'Размер собаки и срок передержки согласуются в диалоге.'});
  add({id:'v4',name:'Дмитрий',en:'Dmitry',kind:'person',tag:'Поиск и листовки',tagEN:'Search and flyers',distance:'0,9',type:'search',groups:['domestic','unknown'],rating:'4,8',price:0},
      {about:'Помогает искать хозяев: обходит двор, расклеивает листовки и пишет в районные чаты.',icon:'target',terms:'Район и время обхода согласуются заранее.'});
  add({id:'o3',name:'Приют «Тёплый дом»',en:'Warm Home shelter',kind:'organization',tag:'Приют',tagEN:'Shelter',distance:'4,6',type:'shelter',groups:['domestic','unknown'],rating:null,price:0},
      {about:'Временный приём и помощь в поиске дома. Принимает корм, лежанки и одеяла.',icon:'home',terms:'Свободные места и приём животного подтверждаются отдельно.'});
  add({id:'o4',name:'Зоомагазин «Лапа»',en:'Lapa pet store',kind:'organization',tag:'Товары первой необходимости',tagEN:'Essentials',distance:'1,5',type:'shop',groups:['domestic','unknown'],rating:'4,7',price:null},
      {about:'Корм, переноски, миски и всё, что нужно в первые сутки. Есть доставка по району.',icon:'office',terms:'Наличие и время доставки уточняются при заказе.'});

  /* [иконка, RU, EN] */
  const D={
    v1:{facts:[24,'18 мин',9],ach:[['clock','Быстрый ответ','Fast replies'],['home','10 передержек','10 stays'],['check','Проверена','Verified'],['heart','Тёплый октябрь','Warm October']],
      serv:[['Передержка до 7 дней','Foster up to 7 days','Бесплатно'],['Встреча и помощь с переноской','Meeting and carrying help','Бесплатно'],['Советы по уходу в первые дни','First-days care advice','Бесплатно']],
      cat:[['bowl','Миска и вода','Bowl and water','Одолжить'],['blanket','Тёплая подстилка','Warm bedding','Одолжить'],['litter','Лоток','Litter tray','Одолжить']]},
    v2:{facts:[17,'25 мин',12],ach:[['scooter','12 поездок','12 rides'],['clock','Приезжает вовремя','On time'],['check','Проверен','Verified']],
      serv:[['Зоотакси по городу','City pet taxi','от 400 ₽'],['Поездка в клинику','Ride to a clinic','от 600 ₽'],['Ночная перевозка','Night ride','По договорённости']],
      cat:[['carrier','Переноска','Carrier','Одолжить'],['blanket','Подстилка в машину','Car bedding','Одолжить']]},
    v3:{facts:[31,'22 мин',14],ach:[['home','14 передержек','14 stays'],['shield','Опыт с собаками','Dog expert'],['check','Проверена','Verified']],
      serv:[['Передержка собак','Dog foster','Бесплатно'],['Консультация по поведению','Behaviour advice','Бесплатно'],['Выходные у меня','Weekend stay','Бесплатно']],
      cat:[['leash','Поводок и шлейка','Leash and harness','Одолжить'],['bowl','Миски','Bowls','Одолжить'],['blanket','Лежанка','Bed','Одолжить']]},
    v4:{facts:[40,'9 мин',21],ach:[['target','21 поиск','21 searches'],['clock','Быстрый ответ','Fast replies'],['heart','Тёплый октябрь','Warm October'],['check','Проверен','Verified']],
      serv:[['Поиск по району','Area search','Бесплатно'],['Расклейка листовок','Flyers','Бесплатно'],['Публикация в районных чатах','Local chat posts','Бесплатно']],
      cat:[]},
    o1:{facts:[61,'42 мин',37],ach:[['shield','Лицензия','Licensed'],['clock','Экстренный приём','Urgent care'],['check','Проверена','Verified']],
      serv:[['Осмотр','Check-up','от 900 ₽'],['Чипирование','Microchipping','1 200 ₽'],['Экстренный приём','Urgent visit','По ситуации']],
      cat:[['kit','Аптечка','First-aid kit','650 ₽'],['carrier','Переноска','Carrier','1 490 ₽'],['food','Корм для выздоровления','Recovery food','от 380 ₽']]},
    o2:{facts:[33,'55 мин',21],ach:[['shield','Дикая природа','Wildlife'],['check','Проверен','Verified'],['heart','Тёплый октябрь','Warm October']],
      serv:[['Консультация по диким животным','Wildlife advice','Бесплатно'],['Выезд специалиста','Specialist visit','Уточнить'],['Передача в реабилитацию','Rehab transfer','Уточнить']],
      cat:[]},
    o3:{facts:[28,'1 ч',16],ach:[['home','16 пристроенных','16 rehomed'],['heart','Тёплый октябрь','Warm October'],['check','Проверен','Verified']],
      serv:[['Временный приём','Temporary intake','Уточнить'],['Помощь в поиске дома','Finding a home','Бесплатно'],['Приём вещей и корма','Donations','Бесплатно']],
      cat:[['food','Корм','Food','Нужно'],['blanket','Лежанки','Beds','Нужно'],['litter','Наполнитель','Litter','Нужно']]},
    o4:{facts:[45,'12 мин',52],ach:[['clock','Доставка за день','Same-day delivery'],['check','Проверен','Verified'],['heart','Тёплый октябрь','Warm October']],
      serv:[['Подбор товаров','Product advice','Бесплатно'],['Доставка по району','Local delivery','от 150 ₽'],['Набор «Первая помощь»','First-aid pack','990 ₽']],
      cat:[['food','Корм, 1 кг','Food, 1 kg','240 ₽'],['bowl','Миска','Bowl','290 ₽'],['carrier','Переноска','Carrier','1 490 ₽'],['leash','Поводок и шлейка','Leash and harness','690 ₽'],['blanket','Тёплая лежанка','Warm bed','590 ₽'],['litter','Лоток','Litter tray','350 ₽'],['water','Поилка','Water bottle','320 ₽'],['kit','Аптечка','First-aid kit','650 ₽']]}
  };
  const L=(ru,en)=>T(ru,en);

  /* ---------- Мелкие части ---------- */
  const HN=h=>lang==='ru'?h.name:(h.en||h.name),HT=h=>lang==='ru'?h.tag:(h.tagEN||h.tag);
  const avatar=(h,cls='')=>`<img class="h-avatar ${cls}" src="${ART.avatar(h.id)}" alt="" width="56" height="56" decoding="async">`;
  const badges=(h,n=3)=>{const d=D[h.id];if(!d)return '';return `<div class="h-badges" aria-label="${L('Достижения','Achievements')}">${d.ach.slice(0,n).map(([ic,ru,en])=>`<span class="h-badge" title="${e(L(ru,en))}">${I(ic)}</span>`).join('')}${d.ach.length>n?`<span class="h-badge more">+${d.ach.length-n}</span>`:''}</div>`};

  /* ---------- Карточка в списке ---------- */
  helperTile=h=>{const saved=isSaved(h.kind,h.id);
    return `<article class="card directory-card hcard"><div class="hc-cover"><img src="${ART.cover(h.id)}" alt="" loading="lazy" decoding="async"><button class="icon-button directory-save ${saved?'saved':''}" data-hub-save="${h.kind}:${h.id}" aria-label="${saved?L('Убрать из избранного','Remove from saved'):L('Добавить в избранное','Add to saved')}" aria-pressed="${saved}">${I('heart')}</button></div><div class="hc-main">${avatar(h)}<div class="hc-title"><h2>${e(HN(h))}</h2><p>${e(HT(h))} · ${h.distance} ${L('км','km')}</p></div></div><div class="hc-foot">${badges(h)}<button class="button secondary hc-open" data-action="helper:${h.id}">${L('Открыть','Open')} ${I('arrow')}</button></div></article>`};
  helperCard=h=>helperTile(h);

  /* ---------- Списки без лишнего ---------- */
  const strip=(html,sels)=>{const t=document.createElement('template');t.innerHTML=html;sels.forEach(s=>t.content.querySelectorAll(s).forEach(n=>n.remove()));return t.innerHTML};
  const dirBefore={vol:V.volunteers,org:V.organizations};
  const dir=f=>()=>strip(f(),['.hub-lead','.hub-crosslinks','.hub-context']);
  V.volunteers=dir(dirBefore.vol);V.organizations=dir(dirBefore.org);
  const helpersBefore=V.helpers;
  V.helpers=()=>strip(helpersBefore(),['.hub-directory-links','.notice:not(.hub-context)']);

  /* ---------- Страница помощника ---------- */
  const helperBefore=V.helper;
  const section=(title,body,cls='')=>`<section class="h-sec ${cls}"><h3>${title}</h3>${body}</section>`;
  const prodCard=(h,[k,ru,en,note],on)=>{const label=/₽/.test(note)?note:note==='Одолжить'?L('Одолжить','Borrow'):note==='Нужно'?L('Нужно приюту','Needed'):note;return `<button class="prod ${on?'on':''}" data-v15="want:${h.id}:${k}" data-note="${e(label)}" aria-pressed="${on}"><span class="prod-img"><img src="${ART.prod(k)}" alt="" loading="lazy"></span><b>${e(L(ru,en))}</b><small>${on?L('В запросе','In request'):e(label)}</small></button>`};
  V.helper=()=>{
    const html=helperBefore(),h=helper(),d=D[h.id];if(!d||!h)return html;
    const t=document.createElement('template');t.innerHTML=html;const f=t.content;
    f.querySelectorAll('.rep,.helper-hero').forEach(n=>n.remove());
    const cards=[...f.children].filter(n=>n.matches('section.card'));
    const about=cards[0],terms=cards[1];
    const aboutText=about?.querySelector('p')?.outerHTML||'';
    const facts=about?.querySelector('.helper-facts')?.outerHTML||'';
    const termsHtml=terms?terms.innerHTML:'';
    const rest=[...f.children].filter(n=>!cards.includes(n));
    const wants=S().wants[h.id]||[];
    const kindLabel=h.kind==='person'?L('Волонтёр','Volunteer'):L('Организация','Organization');
    const hero=`<header class="h-hero"><div class="h-cover"><img src="${ART.cover(h.id)}" alt=""></div><div class="h-id">${avatar(h,'xl')}<div><small>${kindLabel}</small><h1>${e(HN(h))}</h1></div></div><div class="h-tags"><span class="badge">${e(HT(h))}</span><span class="badge">${h.distance} ${L('км','km')}</span></div></header>`;
    const stats=`<div class="h-stats"><div><strong>${d.facts[0]}</strong><small>${L('ответов','replies')}</small></div><div><strong>${d.facts[1].replace('мин',L('мин','min')).replace(/ ч$/,' '+L('ч','h'))}</strong><small>${L('время ответа','reply time')}</small></div><div><strong>${d.facts[2]}</strong><small>${L('помогли','helped')}</small></div></div>`;
    const ach=section(L('Достижения','Achievements'),`<div class="h-ach">${d.ach.map(([ic,ru,en])=>`<div class="h-ach-item"><span>${I(ic)}</span><small>${e(L(ru,en))}</small></div>`).join('')}</div>`);
    const serv=section(L('Услуги','Services'),`<ul class="h-serv">${d.serv.map(([ru,en,price])=>`<li><span>${e(L(ru,en))}</span><b>${e(/Бесплатно/.test(price)?L('Бесплатно','Free'):/от /.test(price)?price.replace('от ',L('от ','from ')):price==='Уточнить'?L('Уточнить','Ask'):price==='По договорённости'?L('По договорённости','By agreement'):price==='По ситуации'?L('По ситуации','Case by case'):price)}</b></li>`).join('')}</ul>`);
    const cat=d.cat.length?section(h.kind==='organization'&&h.type!=='shelter'?L('Первое необходимое','First essentials'):h.type==='shelter'?L('Что нужно приюту','What the shelter needs'):L('Можно одолжить','Available to borrow'),`<div class="h-cat rail">${d.cat.map(p=>prodCard(h,p,wants.includes(p[0]))).join('')}</div><p class="caption">${L('Отметьте нужное — оно попадёт в запрос.','Mark what you need — it joins the request.')}</p>`,'h-cat-sec'):'';
    const sideBtns=[];const more=[];
    const stack=rest.find(n=>n.classList?.contains('stack'));
    if(stack){[...stack.children].forEach(b=>{if(b.matches('[data-hub-save^="person"],[data-hub-save^="organization"],[data-hub-helper-ask]'))sideBtns.push(b.outerHTML);else more.push(b.outerHTML)})}
    const others=rest.filter(n=>n!==stack).map(n=>n.outerHTML).join('');
    const moreBlock=more.length?`<details class="h-more"><summary>${L('Ещё','More')}</summary><div class="stack">${more.join('')}</div></details>`:'';
    return `<div class="helper-page">${hero}${stats}<div class="h-about">${aboutText}</div>${ach}${serv}${cat}<details class="h-more"><summary>${L('Условия и согласие','Terms and consent')}</summary><div class="h-more-body">${termsHtml}${facts}</div></details>${others}<div class="stack mt">${sideBtns.join('')}</div>${moreBlock}</div>`;
  };

  /* ---------- Разгрузка экранов ---------- */
  const tpl=h=>{const t=document.createElement('template');t.innerHTML=h;return t};
  const nbBefore=V['nearby-case'];V['nearby-case']=()=>(state.v14?.loc||'district')==='district'?strip(nbBefore(),['.loc-note']):nbBefore();
  const trBefore=V['triage-result'];
  V['triage-result']=()=>{const t=tpl(trBefore());t.content.querySelectorAll('.notice').forEach(n=>n.remove());return t.innerHTML};
  const UNK={'Группа':['Group','группа'],'Пол':['Sex','пол'],'Окрас':['Colour','окрас'],'Габариты':['Size','размер'],'Порода':['Breed','порода'],'Адресник':['Tag','адресник']};
  const animalBefore=V.animal;
  V.animal=()=>{const t=tpl(animalBefore()),g=t.content.querySelector('.trait-grid');
    if(g){const all=[...g.children],un=all.filter(x=>/Неизвестно|Unknown/.test(x.textContent.replace(x.querySelector('small')?.textContent||'','')));
      if(un.length&&un.length<all.length){const names=un.map(x=>{const k=x.querySelector('small').textContent.trim();return UNK[k]?T(UNK[k][1],UNK[k][0].toLowerCase()):k.toLowerCase()});un.forEach(x=>x.remove());
        g.insertAdjacentHTML('afterend',`<p class="caption trait-unk">${T('Не указано','Not specified')}: ${names.join(', ')}</p>`)}}
    return t.innerHTML};

  /* ---------- Главная: Скаут по центру ---------- */
  const homeBefore=V.home;
  V.home=()=>homeBefore().replace(/<div class="home-scout-art">([\s\S]*?)<\/div>/,'<button class="home-scout-art" data-go="scout" aria-label="Скаут">$1</button>');

  /* ---------- Обработчики ---------- */
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-v15]');if(!b)return;
    const [a,id,key]=b.dataset.v15.split(':');
    if(a==='want'){ev.preventDefault();ev.stopImmediatePropagation();
      const s=S(),list=s.wants[id]??=[],i=list.indexOf(key);
      if(i<0)list.push(key);else list.splice(i,1);
      const on=i<0;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
      const sm=b.querySelector('small');if(sm)sm.textContent=on?L('В запросе','In request'):b.dataset.note;
      persist();toast(on?L('Добавлено в запрос','Added to request'):L('Убрано из запроса','Removed from request'));
    }
  },true);

  /* ---------- Настройки: меньше карточек ---------- */
  function tidy(){
    if(screen==='case'){const pg=app.querySelector('.screen:not(.screen-outgoing)');if(pg&&!pg.dataset.v15){pg.dataset.v15='1';
      pg.querySelectorAll('.detail-traits,.stage-preview,.detail-forecast').forEach(n=>n.remove());
      const st=pg.querySelector('.stack.mt');if(st&&!st.querySelector('[data-go="route"]'))st.insertAdjacentHTML('afterbegin',`<button class="list-row" data-go="route">${I('map')}<span>${T('Маршрут помощи','Help journey')}</span><span class="tail">${I('arrow')}</span></button>`);
      pg.querySelectorAll('.mini-actions [data-go="edit-animal"],.mini-actions [data-go="matches"]').forEach(n=>n.remove())}return}
    if(screen==='home'){const pg=app.querySelector('.screen:not(.screen-outgoing)');if(pg&&!pg.dataset.v15){pg.dataset.v15='1';
      pg.querySelectorAll('.stage-preview,.soft-scout-note,.scroll-content > .button.secondary[data-go="nearby"]').forEach(n=>n.remove())}return}
    if(screen!=='settings')return;
    const page=app.querySelector('.screen:not(.screen-outgoing)');if(!page||page.dataset.v15)return;
    const comfort=page.querySelector('.account-access .settings-toggles'),ts=page.querySelector('.ts-card'),loc=page.querySelector('.loc-card'),off=page.querySelector('[data-v14-toggle="offline"]')?.closest('section.card'),priv=page.querySelector('.account-privacy');
    if(!comfort||!ts||!loc||!off||!priv)return;
    page.dataset.v15='1';
    const offRow=off.querySelector('.preference-row');if(offRow)comfort.append(offRow);off.remove();
    const tsWrap=document.createElement('div');tsWrap.className='ts-card ts-inline';tsWrap.innerHTML=`<span class="ts-label">${T('Размер текста','Text size')}</span>`;
    tsWrap.append(ts.querySelector('.seg'),ts.querySelector('.ts-sample'));comfort.after(tsWrap);ts.remove();
    const locWrap=document.createElement('div');locWrap.className='loc-card loc-inline';locWrap.innerHTML=`<span class="ts-label">${T('Как показывать место','How to show the location')}</span>`;
    locWrap.append(loc.querySelector('.seg'),loc.querySelector('#loc-desc'));
    tsWrap.after(locWrap);loc.remove();
    ['volunteers','organizations','stories'].forEach(d=>page.querySelector(`.settings-tools [data-go="${d}"]`)?.remove());
    if(lang==='en'&&window.podhvat.i18n)window.podhvat.i18n.translate(page);
  }

  /* ---------- Переход вкладок: снизу вверх, только контент ---------- */
  const stack=[];let lastTab=null,lastScreen=null;
  const EASE='cubic-bezier(.22,.8,.24,1)';
  const dirOf=()=>{
    const prev=stack[stack.length-2];
    if(prev===screen){stack.pop();return 'back'}
    stack.push(screen);if(stack.length>40)stack.shift();return 'open';
  };
  const renderBeforeMotion=render;
  render=function(...a){
    const changed=lastScreen!==null&&lastScreen!==screen;
    const dirn=changed?dirOf():(stack.length?'same':(stack.push(screen),'same'));
    const tabChange=changed&&lastTab!==null&&lastTab!==tabFor(screen);
    lastScreen=screen;lastTab=tabFor(screen);
    const r=renderBeforeMotion.apply(this,a);
    tidy();
    if(!changed||reduced())return r;
    const page=app.querySelector('.screen:not(.screen-outgoing)');
    const body=page?.querySelector(':scope > .scroll-content');
    if(body&&body.animate){
      const from=dirn==='back'?{transform:'translate3d(0,-14px,0)',opacity:.0}:{transform:`translate3d(0,${tabChange?34:24}px,0)`,opacity:0};
      body.animate([from,{transform:'translate3d(0,0,0)',opacity:1}],{duration:dirn==='back'?340:460,easing:EASE,fill:'backwards'});
    }
    const out=app.querySelector('.screen-outgoing > .scroll-content');
    if(out&&out.animate){
      out.animate([{transform:'translate3d(0,0,0)'},{transform:dirn==='back'?'translate3d(0,26px,0)':'translate3d(0,-10px,0)'}],{duration:380,easing:EASE,fill:'forwards'});
    }
    return r;
  };
  window.podhvat.v15={data:D,art:ART};
  if(lang==='en'&&window.podhvat.i18n){}
  render();
})();

/* ===== src/js/21-v16.js ===== */
/* v16: таймер ожидания, голосовое описание, передержка на ночь; эмоции Скаута, вибрация отклика,
   пустые экраны с Скаутом, тёмная тема по времени суток, системный размер текста, анимация закрытия. */
(()=>{
  const S=()=>{state.v16??={};const s=state.v16;s.haptics??=true;s.autoNight??=false;s.sysText??=false;s.night??={};return s};
  const L=(ru,en)=>T(ru,en);
  const reduced=()=>document.body.classList.contains('reduce-motion')||state.prefs?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROUTE=(id,ru,en,section,desc)=>{if(!SCREEN_REGISTRY.some(s=>s[0]===id))SCREEN_REGISTRY.push([id,ru,en,section,desc])};
  const page=()=>app.querySelector('.screen:not(.screen-outgoing)');
  const tr=n=>{if(lang==='en'&&window.podhvat.i18n&&n)window.podhvat.i18n.translate(n)};

  /* ---------- Вибрация отклика ---------- */
  const buzz=p=>{try{if(S().haptics&&!reduced()&&navigator.vibrate)navigator.vibrate(p)}catch{}};

  /* ---------- 1. Таймер ожидания ---------- */
  const HOUR=3600000;
  const since=c=>Math.max(0,Date.now()-new Date(c.foundAt).getTime());
  const fmt=ms=>{const m=Math.floor(ms/60000);if(m<1)return L('только что','just now');
    const h=Math.floor(m/60),mm=m%60;
    if(h<1)return m+' '+L('мин','min');
    if(h<24)return h+' '+L('ч','h')+(mm?' '+mm+' '+L('мин','min'):'');
    return Math.floor(h/24)+' '+L('сут','d')+' '+(h%24)+' '+L('ч','h')};
  const phaseOf=ms=>ms<HOUR?0:ms<3*HOUR?1:ms<24*HOUR?2:3;
  const PHASES=()=>[
    {ru:'Первый час',en:'First hour',tru:'Сначала безопасность и фото. Не кормите и не везите сразу.',ten:'Safety and a photo first. Don’t feed or transport yet.',cta:['voice',L('Описать голосом','Describe by voice')]},
    {ru:'Ищем хозяина',en:'Looking for the owner',tru:'Чаще всего хозяева ищут в первые часы. Опубликуйте листовку с районом.',ten:'Owners usually search in the first hours. Publish a flyer with the area.',cta:['go:flyer',L('Открыть листовку','Open the flyer')]},
    {ru:'Скоро вечер',en:'Evening is near',tru:'Если хозяина не нашли, подготовьте место на ночь.',ten:'If the owner isn’t found, arrange a place for the night.',cta:['go:night-foster',L('Передержка на ночь','One-night foster')]},
    {ru:'Сутки позади',en:'A day has passed',tru:'Подключите организации и районные чаты.',ten:'Bring in organisations and neighbourhood chats.',cta:['go:helpers',L('Найти помощь','Find help')]}
  ];
  const segFill=(ms,i)=>{const b=[0,HOUR,3*HOUR,24*HOUR];return Math.round(Math.min(1,Math.max(0,(ms-b[i])/(b[i+1]-b[i])))*100)};
  function waitCard(c){
    const ms=since(c),ph=phaseOf(ms),P=PHASES()[ph];
    const night=S().night[c.id];
    let cta=P.cta;
    if(night?.accepted)cta=['go:tasks',L('Задачи по случаю','Case tasks')];
    const body=night?.accepted?L('Ночь устроена: передержка согласована.','Night arranged: foster care is agreed.'):L(P.tru,P.ten);
    const title=night?.accepted?L('Есть место на ночь','A place for the night'):L(P.ru,P.en);
    const act=cta[0].startsWith('go:')?`data-go="${cta[0].slice(3)}"`:`data-v16="${cta[0]}"`;
    return `<section class="card wait-card" data-wait data-phase="${ph}" aria-label="${L('Сколько уже ждёт','Time waiting')}">
      <div class="wait-head"><span class="wait-ico" aria-hidden="true">${I('clock')}</span><div><small>${L('Ждёт помощи','Waiting for help')}</small><strong data-wait-time>${fmt(ms)}</strong></div></div>
      <div class="wait-track" role="img" aria-label="${L('Этапы первых суток','First-day stages')}">${[0,1,2].map(i=>`<i><b style="width:${segFill(ms,i)}%"></b></i>`).join('')}</div>
      <div class="wait-marks" aria-hidden="true"><span>0</span><span>1 ${L('ч','h')}</span><span>3 ${L('ч','h')}</span><span>${L('сутки','1 day')}</span></div>
      <h3>${title}</h3><p>${body}</p>
      <button class="button" ${act}>${cta[1]}</button></section>`;
  }
  function refreshWait(){
    const c=current();if(!c)return;
    const card=document.querySelector('.screen:not(.screen-outgoing) [data-wait]');
    if(card&&c.lifecycle!=='closed'){
      const ms=since(c),ph=phaseOf(ms);
      if(String(ph)!==card.dataset.phase){const tmp=document.createElement('div');tmp.innerHTML=waitCard(c);card.replaceWith(tmp.firstElementChild);tr(tmp);}
      else{card.querySelector('[data-wait-time]').textContent=fmt(ms);card.querySelectorAll('.wait-track b').forEach((b,i)=>b.style.width=segFill(ms,i)+'%')}
    }
    const hs=document.querySelector('.screen:not(.screen-outgoing) [data-wait-home]');
    if(hs&&c.lifecycle!=='closed')hs.textContent=L('Ждёт ','Waiting ')+fmt(since(c))+' · #'+c.number;
  }
  setInterval(refreshWait,15000);

  /* ---------- 2. Голосовое описание ---------- */
  const COLORS=[[/рыж|ginger|orange/,'рыжий','ginger'],[/бежев|песочн|sandy|beige|tan(?![а-я])/,'бежевый','beige'],[/чёрн|черн|black/,'чёрный','black'],[/сер(?:ый|ая|ое|ые|ого)|gr[ae]y/,'серый','gray'],[/коричнев|шоколад|brown/,'коричневый','brown'],[/пятнист|spotted/,'пятнистый','spotted'],[/полосат|табби|tabby|striped/,'полосатый','tabby'],[/трёхцвет|трехцвет|calico/,'трёхцветный','calico'],[/(?:^|[^а-яё])бел(?:ый|ая|ое|ые|ого)(?![а-яё])|white/,'белый','white']];
  const WHITE={груд:['Белая грудь','White chest'],лап:['Белые лапы','White paws'],пятн:['Белое пятно','White patch'],носк:['Белые носки','White socks'],хвост:['Белый кончик хвоста','White tail tip'],морд:['Белая морда','White muzzle']};
  const FEATS=[
    [/бел[а-яё]+\s+(?:груд|лап|пятн|носк|кончик|морд)[а-яё]*(?:\s+хвоста)?/,m=>{const k=Object.keys(WHITE).find(x=>m[0].includes(x));return L(...WHITE[k])}],
    [/white\s+(?:chest|paws|patch|tail tip)/,m=>m[0].replace(/^./,x=>x.toUpperCase())],
    [/(?:красн|син|зелён|зелен|чёрн|черн|розов|жёлт|желт|оранжев|red|blue|green|black|pink|yellow)[а-яёa-z]*\s+(?:ошейник|collar)[а-яё]*/,m=>m[0]],
    [/ошейник|collar/,()=>L('Ошейник','Collar')],[/шлейк|harness/,()=>L('Шлейка','Harness')],[/поводок|leash/,()=>L('Поводок','Leash')],[/адресник|жетон|tag/,()=>L('Адресник','ID tag')],
    [/шрам|scar/,()=>L('Шрам','Scar')],[/хромает|хромой|limp/,()=>L('Хромает','Limping')],[/без хвоста|короткий хвост|no tail|short tail/,m=>m[0]],
    [/рваное ухо|одно ухо|torn ear/,m=>m[0]],[/висячие уши|стоячие уши|floppy ears|pointy ears/,m=>m[0]],
    [/пушист|длинная шерсть|fluffy|long fur/,m=>m[0]],[/короткая шерсть|short fur/,m=>m[0]],[/голубые глаза|разные глаза|blue eyes|odd eyes/,m=>m[0]]
  ];
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function parseDesc(raw){
    const t=(raw||'').toLowerCase(),out={features:[],warn:false};
    const idx=src=>{const m=new RegExp('(?:^|[^а-яёa-z])(?:'+src+')','i').exec(t);return m?m.index:-1};
    const dog=idx('собак|пёс|пес(?![а-яё])|щенк|кобел|dog|puppy'),cat=idx('кошк|кот(?![а-яё])|котён|котен|котик|кошеч|cat|kitten');
    if(dog>=0&&(cat<0||dog<cat))out.species='dog';else if(cat>=0)out.species='cat';
    if(idx('маленьк|небольш|мелк|мини|small|tiny')>=0)out.size='small';
    else if(idx('средн|medium')>=0)out.size='medium';
    else if(idx('больш|крупн|огромн|large|big')>=0)out.size='large';
    if(idx('девочк|сука|кошка|кошечк|женск|female|girl')>=0)out.sex='female';
    else if(idx('мальчик|кобел|пёс|пес(?![а-яё])|кот(?![а-яё])|самец|мужск|male|boy')>=0)out.sex='male';
    let rest=t;
    for(const [re,fn] of FEATS){const m=rest.match(re);if(m){const f=cap(fn(m));if(!out.features.some(x=>x.toLowerCase()===f.toLowerCase()))out.features.push(f);rest=rest.replace(re,' ')}}
    const cols=[];for(const [re,ru,en] of COLORS){const w=L(ru,en);if(re.test(rest)&&!cols.includes(w))cols.push(w)}
    if(cols.length)out.color=cols.slice(0,2).join(' / ');
    if(/ранен|кров|не встаёт|не встает|сбит|попал под|переломан|injur|bleed|hit by/.test(t))out.warn=true;
    return out;
  }
  const speciesName=s=>s==='dog'?L('Собака','Dog'):s==='cat'?L('Кошка','Cat'):s;
  function voiceItems(p){
    const it=[];
    if(p.species)it.push(['species',L('Вид','Species'),speciesName(p.species)]);
    if(p.color)it.push(['color',L('Окрас','Colour'),p.color]);
    if(p.size)it.push(['size',L('Габариты','Size'),sizeLabel(p.size)]);
    if(p.sex)it.push(['sex',L('Пол','Sex'),sexLabel(p.sex)]);
    if(p.features.length)it.push(['features',L('Приметы','Features'),p.features.join(', ')]);
    return it;
  }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  let rec=null,recBase='';
  function openVoice(){
    const c=current();if(c.lifecycle==='closed'){toast(L('Карточка закрыта.','This case is closed.'));return}
    modal.innerHTML=`<h2>${L('Расскажите о животном','Tell me about the animal')}</h2>
      <div class="voice-box"><button type="button" class="voice-mic" data-v16="voice-toggle" aria-pressed="false" aria-label="${L('Говорить','Speak')}">${I('mic')}</button><span class="voice-state" id="voice-state" role="status">${SR?L('Нажмите и говорите','Tap and speak'):L('Голосовой ввод здесь недоступен. Продиктуйте с клавиатуры телефона или напишите.','Voice input is unavailable here. Dictate from your phone keyboard or type.')}</span></div>
      <label class="field">${L('Описание','Description')}<textarea id="voice-text" maxlength="400" rows="3" placeholder="${L('Рыжая собака, средняя, белая грудь, красный ошейник','Ginger dog, medium size, white chest, red collar')}"></textarea></label>
      <div id="voice-parse" class="voice-parse" aria-live="polite"></div>
      <div class="stack"><button type="button" class="button" data-v16="voice-apply" disabled>${L('Заполнить карточку','Fill the card')}</button><button type="button" class="button secondary" data-action="dismiss">${L('Закрыть','Close')}</button></div>`;
    tr(modal);modal.showModal();
    document.getElementById('voice-text').addEventListener('input',renderParse);
    document.getElementById('voice-text').focus({preventScroll:true});
  }
  function renderParse(){
    const ta=document.getElementById('voice-text'),box=document.getElementById('voice-parse'),btn=modal.querySelector('[data-v16="voice-apply"]');if(!ta||!box)return;
    const p=parseDesc(ta.value),items=voiceItems(p);
    box.innerHTML=(items.length?`<small>${L('Нашёл в описании','Found in the description')}</small>`+items.map(([k,n,v])=>`<label class="vp-item"><input type="checkbox" data-k="${k}" checked><span><small>${n}</small><b>${e(v)}</b></span></label>`).join(''):ta.value.trim()?`<small>${L('Пока ничего не распознано. Назовите вид, окрас, размер или приметы.','Nothing recognised yet. Mention species, colour, size or features.')}</small>`:'')
      +(p.warn?`<div class="notice vp-warn">${L('Если животное ранено или не встаёт, не ждите.','If the animal is injured or can’t stand, don’t wait.')} <button type="button" class="text-button" data-go="emergency">${L('Срочная помощь','Urgent help')}</button></div>`:'');
    box._parsed=p;btn.disabled=!items.length;tr(box);
  }
  function stopVoice(){const r=rec;rec=null;try{r?.stop()}catch{}const b=modal.querySelector('.voice-mic');if(b){b.setAttribute('aria-pressed','false');b.classList.remove('live')}}
  function toggleVoice(){
    const st=document.getElementById('voice-state'),b=modal.querySelector('.voice-mic'),ta=document.getElementById('voice-text');
    if(!SR){st.textContent=L('Голосовой ввод недоступен в этом браузере. Напишите текстом.','Voice input isn’t available in this browser. Type instead.');ta.focus();return}
    if(rec){stopVoice();st.textContent=L('Остановлено','Stopped');return}
    try{
      rec=new SR();rec.lang=lang==='ru'?'ru-RU':'en-US';rec.interimResults=true;rec.continuous=true;recBase=ta.value?ta.value.trim()+' ':'';
      rec.onresult=ev=>{ta.value=(recBase+Array.from(ev.results).map(r=>r[0].transcript).join(' ')).slice(0,400);renderParse()};
      rec.onerror=ev=>{const denied=ev.error==='not-allowed'||ev.error==='service-not-allowed';st.textContent=denied?L('Нет доступа к микрофону. Напишите текстом.','No microphone access. Type instead.'):L('Не расслышал. Попробуйте ещё раз или напишите.','Didn’t catch that. Try again or type.');stopVoice()};
      rec.onend=()=>{if(rec){stopVoice();st.textContent=L('Готово. Проверьте текст.','Done. Check the text.')}};
      rec.start();b.setAttribute('aria-pressed','true');b.classList.add('live');st.textContent=L('Слушаю…','Listening…');buzz(10);
    }catch{rec=null;st.textContent=L('Не удалось включить микрофон. Напишите текстом.','Couldn’t start the microphone. Type instead.')}
  }
  function applyVoice(){
    const c=current(),box=document.getElementById('voice-parse');if(!box?._parsed||c.lifecycle==='closed')return;
    const p=box._parsed,on=k=>box.querySelector(`[data-k="${k}"]`)?.checked;
    if(p.species&&on('species'))c.species=p.species;
    if(p.color&&on('color'))c.color=p.color;
    if(p.size&&on('size'))c.size=p.size;
    if(p.sex&&on('sex'))c.sex=p.sex;
    if(p.features.length&&on('features')){const cur=(c.features||'').trim(),low=cur.toLowerCase(),add=p.features.filter(f=>!low.includes(f.toLowerCase()));if(add.length)c.features=[cur,...add].filter(Boolean).join(', ');c.featuresEN=c.features}
    c.step=Math.max(c.step,1);addLog('Карточка заполнена по голосовому описанию','Card filled from a voice description');
    stopVoice();closeModal();buzz([10,40,16]);
    if(screen==='edit-animal')render();else go('edit-animal');
    toast(L('Проверьте поля и сохраните карточку.','Check the fields and save the card.'));
  }

  /* ---------- 3. Передержка на ночь ---------- */
  const nightPool=c=>helpers.filter(h=>['foster','shelter'].includes(h.type)&&h.groups.includes(c.group)).sort((a,b)=>parseFloat(String(a.distance).replace(',','.'))-parseFloat(String(b.distance).replace(',','.')));
  const reply=(h,c)=>h.type==='shelter'?['no',L('Свободных мест до утра нет','No free places until morning')]:h.id==='v3'&&c.species!=='dog'?['no',L('Берёт только собак','Takes dogs only')]:['yes',L('Готов(а) взять до 9:00','Can take it until 9:00')];
  const nameOf=h=>lang==='ru'?h.name:(h.en||h.name);
  const hAvatar=h=>`<img class="h-avatar" src="${window.podhvat.v15?.art?.avatar(h.id)||''}" alt="" width="48" height="48">`;
  const NIGHT_OFFS=[3000,6000,9000];
  V['night-foster']=()=>{
    const c=current(),n=S().night[c.id];
    if(c.lifecycle==='closed')return hint(L('Случай закрыт.','This case is closed.'))+link(L('Открыть историю','Open history'),'history-case','');
    if(restricted(c))return `${scope()}<h1>${L('Передержка на ночь','One-night foster')}</h1>`+hint(L('Для этой группы передержку согласует специалист.','A specialist directs care for this group.'))+link(L('Найти специалиста','Find a specialist'),'helpers','');
    const head=`${scope()}<h1>${L('Передержка на ночь','One-night foster')}</h1>`;
    if(!n){
      return head+`<p class="muted">${L('Без обязательств: до утра. Запрос получат те, кто принимает животных на передержку рядом.','No commitment: until morning. People nearby who take animals in will get the request.')}</p>
      <section class="card nf-for"><img class="animal-photo" src="${e(c.photo||'assets/dog.png')}" alt=""><div><b>${e(name(c))}</b><small>${sizeLabel(c.size)} · ${e(c.publicPlace||'')}</small></div></section>
      <form id="night-form" class="nf-form"><fieldset class="nf-when"><legend>${L('Когда нужна','When needed')}</legend>
        <div class="seg" role="radiogroup" aria-label="${L('Когда нужна','When needed')}"><button type="button" role="radio" aria-checked="true" class="active" data-v16="nf-when:evening">${L('Сегодня вечером','This evening')}</button><button type="button" role="radio" aria-checked="false" data-v16="nf-when:night">${L('Ночью','Overnight')}</button></div></fieldset>
        <label class="check"><input type="checkbox" id="nf-carrier" checked>${L('Есть переноска или поводок','I have a carrier or leash')}</label>
        <label class="check"><input type="checkbox" id="nf-bring">${L('Могу привезти сам(а)','I can bring it myself')}</label>
        <p class="caption">${L('Район виден всем, точный адрес — только после согласия.','The area is visible to all; the exact address only after consent.')}</p>
        <button class="button" type="submit">${L('Разослать запрос','Send the request')}</button></form>`;
    }
    const el=Date.now()-n.at,pool=n.pool.map((id,i)=>{const h=helpers.find(x=>x.id===id),r=reply(h,c);return{h,i,ans:el>=NIGHT_OFFS[i]?r:null}});
    const done=pool.every(x=>x.ans);
    const rows=pool.map(({h,ans})=>{
      const taken=n.accepted===h.id,locked=n.accepted&&!taken&&ans&&ans[0]==='yes';
      const st=taken?`<span class="nf-st ok">${L('Принял(а) на ночь','Accepted for the night')}</span>`:locked?`<span class="nf-st">${L('Не нужно','Not needed')}</span>`:!ans?`<span class="nf-st wait"><i></i>${L('Ждём ответа','Waiting for a reply')}</span>`:ans[0]==='yes'?`<span class="nf-st ok">${ans[1]}</span>`:`<span class="nf-st no">${ans[1]}</span>`;
      const btn=!n.accepted&&ans&&ans[0]==='yes'?`<button class="button nf-take" data-v16="night-accept:${h.id}">${L('Принять','Accept')}</button>`:'';
      return `<article class="card nf-row ${taken?'taken':''}">${hAvatar(h)}<div class="nf-main"><b>${e(nameOf(h))}</b><small>${e(lang==='ru'?h.tag:h.tagEN)} · ${h.distance} ${L('км','km')}</small>${st}</div>${btn}</article>`}).join('');
    const acc=n.accepted?`<section class="card nf-done"><span class="wait-ico" aria-hidden="true">${I('check')}</span><div><h3>${L('Ночь устроена','The night is arranged')}</h3><p>${L('Контакты откроются после согласия обеих сторон.','Contacts open after both sides consent.')}</p></div><div class="stack"><button class="button" data-go="consent">${L('Согласие на контакты','Contact consent')}</button><button class="button secondary" data-go="tasks">${L('Задачи по случаю','Case tasks')}</button></div></section>`:'';
    const none=done&&!n.accepted&&!pool.some(x=>x.ans[0]==='yes')?hint(L('Сейчас никто не может. Расширьте поиск или попросите Скаута подсказать другие варианты.','Nobody can right now. Widen the search or ask Scout for other options.'))+link(L('Все помощники','All helpers'),'helpers','secondary'):'';
    return head+`<p class="muted">${n.accepted?L('Запрос закрыт.','Request closed.'):L('Запрос отправлен. Ответы приходят по мере готовности.','Request sent. Replies arrive as people respond.')}</p>${acc}<div class="nf-list">${rows}</div>${none}`;
  };
  ROUTE('night-foster','Передержка на ночь','One-night foster','Связь','Быстрый запрос на одну ночь: без обязательств, ответы по мере готовности, принятие в один тап.');
  let nightTimer=null;
  function nightWatch(){
    clearInterval(nightTimer);if(screen!=='night-foster')return;
    nightTimer=setInterval(()=>{if(screen!=='night-foster'){clearInterval(nightTimer);return}
      const n=S().night[current().id];if(!n||n.accepted){clearInterval(nightTimer);return}
      const el=Date.now()-n.at;if(NIGHT_OFFS.some(o=>Math.abs(el-o)<1100)||el<NIGHT_OFFS[2]+1100)render();else clearInterval(nightTimer)},1000);
  }
  const baseTabFor=tabFor;tabFor=id=>id==='night-foster'?'chats':baseTabFor(id);

  /* ---------- Обработчики ---------- */
  window.addEventListener('click',ev=>{
    const raw=ev.target.closest('button,a,[data-v16]');
    if(raw){const b=raw.closest('button');
      if(b&&!b.disabled&&(b.classList.contains('button')&&!b.classList.contains('secondary')||b.dataset.action==='confirm-close'))buzz(b.dataset.action==='confirm-close'?[12,50,18]:8);
      if(b?.dataset.action==='theme'&&S().autoNight){S().autoNight=false;document.body.classList.remove('night-auto');persist()}
      if(b?.matches('[data-v14^="ts:"]')&&S().sysText){S().sysText=false;persist();applySys()}}
    const t=ev.target.closest('[data-v16]');if(!t)return;
    const [a,x]=t.dataset.v16.split(':');
    if(a==='voice'){ev.preventDefault();ev.stopPropagation();openVoice()}
    else if(a==='voice-toggle'){ev.preventDefault();ev.stopPropagation();toggleVoice()}
    else if(a==='voice-apply'){ev.preventDefault();ev.stopPropagation();applyVoice()}
    else if(a==='nf-when'){ev.preventDefault();ev.stopPropagation();t.parentElement.querySelectorAll('button').forEach(k=>{const on=k===t;k.classList.toggle('active',on);k.setAttribute('aria-checked',on)});t.parentElement.dataset.value=x;buzz(6)}
    else if(a==='night-accept'){ev.preventDefault();ev.stopPropagation();acceptNight(x)}
    else if(a==='ts-sys'){ev.preventDefault();ev.stopPropagation();const s=S();s.sysText=true;persist();applySys();t.parentElement.querySelectorAll('button').forEach(k=>{const on=k===t;k.classList.toggle('active',on);k.setAttribute('aria-checked',on)});buzz(6)}
  },true);
  modal.addEventListener('close',()=>{try{rec?.stop()}catch{}rec=null});
  document.addEventListener('submit',ev=>{
    if(ev.target.id!=='night-form')return;ev.preventDefault();
    const c=current(),pool=nightPool(c).slice(0,3).map(h=>h.id);
    S().night[c.id]={at:Date.now(),when:ev.target.querySelector('.nf-when .seg')?.dataset.value||'evening',carrier:document.getElementById('nf-carrier').checked,bring:document.getElementById('nf-bring').checked,pool,accepted:null};
    c.step=Math.max(c.step,3);addLog('Отправлен запрос на передержку на ночь','One-night foster request sent');persist();buzz([10,40,10]);render();
  },true);
  function acceptNight(id){
    const c=current(),n=S().night[c.id];if(!n||n.accepted||c.lifecycle==='closed')return;
    const h=helpers.find(x=>x.id===id);n.accepted=id;
    c.tasks.push({id:'tn'+Date.now(),helperId:id,type:'foster',title:'Передержка на одну ночь',titleEN:'One-night foster',status:'assigned',deadline:'До 9:00 утра'});
    c.carePassed=true;c.step=Math.max(c.step,3);
    addLog('Передержка на ночь: '+h.name,'One-night foster: '+(h.en||h.name));award('agreement');persist();buzz([10,40,10,40,22]);render();
    toast(L('Место на ночь найдено.','A place for the night is found.'));
  }

  /* ---------- Главная: Скаут по ситуации ---------- */
  const emotionFor=c=>!c?'calm':c.lifecycle==='closed'?'happy':c.urgency==='urgent'?'support':(phaseOf(since(c))>=2&&!S().night[c.id]?.accepted)?'listening':'calm';
  const ASSET={calm:'assets/scout.png',listening:'assets/scout-listening.png',happy:'assets/scout-happy.png',support:'assets/scout-support.png'};
  const homeBefore=V.home;
  V.home=()=>{
    const c=current(),em=emotionFor(c);
    let h=homeBefore();
    h=h.replace('<button class="home-scout-art" data-go="scout"',`<button class="home-scout-art" data-emotion="${em}" data-go="scout"`).replace(/(<button class="home-scout-art"[^>]*>\s*<img[^>]*?src=")[^"]*(")/,`$1${ASSET[em]}$2`);
    return h;
  };
  const helpersBefore=V.helpers;
  V.helpers=()=>{let h=helpersBefore();const c=current();
    if(c&&c.lifecycle!=='closed'&&!restricted(c)&&!/night-entry/.test(h))h=h.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/,`$1<button class="night-entry" data-go="night-foster"><span class="ne-ico" aria-hidden="true">${I('home')}</span><span><b>${L('Передержка на ночь','One-night foster')}</b><small>${L('Быстрый запрос тем, кто принимает на одну ночь','A quick request to people who take animals for one night')}</small></span><span class="ne-arrow" aria-hidden="true">${I('arrow')}</span></button>`);
    return h};

  /* ---------- Пустые экраны с Скаутом ---------- */
  const SCENES={
    history:'<svg viewBox="0 0 320 150" aria-hidden="true"><rect x="40" y="96" width="240" height="10" rx="5" class="eh-b"/><rect x="62" y="48" width="38" height="48" rx="8" class="eh-a"/><rect x="108" y="38" width="34" height="58" rx="8" class="eh-c"/><rect x="150" y="56" width="40" height="40" rx="8" class="eh-b"/><path d="M72 62h18M72 72h12" class="eh-l"/><circle cx="256" cy="46" r="14" class="eh-a"/><path d="M250 46l4 4 8-9" class="eh-ck"/></svg>',
    chats:'<svg viewBox="0 0 320 150" aria-hidden="true"><rect x="40" y="30" width="120" height="46" rx="18" class="eh-c"/><path d="M60 84l-4 18 22-14z" class="eh-c"/><rect x="150" y="70" width="128" height="46" rx="18" class="eh-a"/><path d="M262 124l4 14-20-10z" class="eh-a"/><path d="M58 48h60M58 60h40" class="eh-l"/><path d="M168 88h70M168 100h44" class="eh-l d"/></svg>',
    tasks:'<svg viewBox="0 0 320 150" aria-hidden="true"><rect x="56" y="22" width="150" height="112" rx="18" class="eh-c"/><rect x="78" y="46" width="18" height="18" rx="6" class="eh-a"/><path d="M82 55l4 4 6-8" class="eh-ck"/><rect x="78" y="76" width="18" height="18" rx="6" class="eh-b"/><rect x="78" y="106" width="18" height="18" rx="6" class="eh-b"/><path d="M108 55h74M108 85h60M108 115h68" class="eh-l"/><circle cx="252" cy="58" r="22" class="eh-a"/><path d="M252 46v14l9 5" class="eh-ck"/></svg>',
    favorites:'<svg viewBox="0 0 320 150" aria-hidden="true"><path d="M110 112C70 84 74 50 100 46c14-2 24 6 30 16 6-10 16-18 30-16 26 4 30 38-10 66-6 4-14 10-20 14-6-4-14-10-20-14z" class="eh-a" transform="translate(30 -6)"/><path d="M240 48l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" class="eh-b"/><circle cx="64" cy="40" r="6" class="eh-b"/></svg>',
    notifications:'<svg viewBox="0 0 320 150" aria-hidden="true"><path d="M130 100h60l-8-14V66a22 22 0 0 0-44 0v20z" class="eh-c"/><circle cx="160" cy="108" r="8" class="eh-a"/><circle cx="196" cy="52" r="10" class="eh-a"/><path d="M92 54a50 50 0 0 1 20-28M228 54a50 50 0 0 0-20-28" class="eh-l d"/></svg>'
  };
  const EMPTY={
    history:{t:['Пока нет закрытых случаев','No closed cases yet'],p:['Когда вы закроете случай, он сохранится здесь вместе с историей.','When you close a case it will be kept here with its history.'],a:['case',['К текущему случаю','To the current case']]},
    chats:{t:['Диалогов пока нет','No conversations yet'],p:['Диалог появится после запроса помощнику или заявителю.','A conversation starts after you send a request to a helper or claimant.'],a:['helpers',['Найти помощника','Find a helper']]},
    tasks:{t:['Задач пока нет','No tasks yet'],p:['Выберите помощника — и здесь появится согласованная задача.','Choose a helper and the agreed task will appear here.'],a:['helpers',['Найти помощника','Find a helper']]},
    favorites:{t:['Сохраните то, что пригодится','Save what may come in handy'],p:['Нажмите сердце в карточке помощника или сохраните полезную статью.','Tap the heart on a helper card or save a useful article.'],a:null},
    notifications:{t:['Новых напоминаний нет','No new reminders'],p:['Когда подойдёт время проверить животное, напоминание появится здесь.','When it is time to check on the animal, a reminder will appear here.'],a:['case',['К случаю','To the case']]}
  };
  const emptyHero=k=>{const E=EMPTY[k];return `<section class="empty-hero" role="status" data-empty-kind="${k}"><div class="eh-scene">${SCENES[k]}<img class="eh-scout" src="assets/scout-listening.png" alt=""></div><h3>${L(...E.t)}</h3><p>${L(...E.p)}</p>${E.a?`<button class="button" data-go="${E.a[0]}">${L(...E.a[1])}</button>`:''}</section>`};

  /* ---------- Тема по времени суток ---------- */
  const isNight=()=>{const h=new Date().getHours();return h>=21||h<7};
  function applyNight(){
    const on=S().autoNight;document.body.classList.toggle('night-auto',!!on&&isNight());
    if(!on)return;const want=isNight()?'dark':'light';
    if(theme!==want){theme=want;render()}
  }
  setInterval(applyNight,60000);

  /* ---------- Системный размер текста ---------- */
  const sysSupported=()=>{try{return CSS.supports('font','-apple-system-body')}catch{return false}};
  function sysScale(){
    if(!sysSupported())return 1;
    const p=document.createElement('span');p.style.cssText='position:absolute;visibility:hidden;font:-apple-system-body';p.textContent='A';document.body.append(p);
    const px=parseFloat(getComputedStyle(p).fontSize)||17;p.remove();return Math.min(1.6,Math.max(.85,px/17));
  }
  function applySys(){
    const on=S().sysText;
    document.body.classList.toggle('ts-sys',on);
    if(on){document.body.classList.remove('ts-115','ts-130');document.body.style.setProperty('--sys-zoom',String(sysScale()))}
    else{document.body.style.removeProperty('--sys-zoom');const v=state.v14?.textScale||100;document.body.classList.remove('ts-115','ts-130');if(v>100)document.body.classList.add('ts-'+v)}
  }
  document.addEventListener('visibilitychange',()=>{if(S().sysText)applySys()});
  window.addEventListener('resize',()=>{if(S().sysText)applySys()});

  /* ---------- Анимация закрытия ---------- */
  let justClosed=false;
  window.addEventListener('click',ev=>{if(ev.target.closest('[data-action="confirm-close"]'))justClosed=true},true);
  function closingOverlay(){
    const c=current();justClosed=false;if(!c||c.lifecycle!=='closed'||app.querySelector('.closing-overlay'))return;
    const o=document.createElement('div');o.className='closing-overlay';o.setAttribute('role','status');
    o.innerHTML=`<div class="co-card"><img class="co-scout" src="assets/scout-happy.png" alt=""><h2>${L('Случай закрыт','Case closed')}</h2><p>${L('Спасибо, что помогли. История сохранена.','Thank you for helping. The history is saved.')}</p></div>`;
    app.append(o);requestAnimationFrame(()=>o.classList.add('in'));
    const off=()=>{o.classList.remove('in');o.classList.add('out');setTimeout(()=>o.remove(),reduced()?0:420)};
    o.addEventListener('click',off);setTimeout(off,reduced()?1400:2600);
  }

  /* ---------- Доводка экранов после рендера ---------- */
  function tidy(){
    const pg=page();if(!pg||pg.dataset.v16)return;pg.dataset.v16='1';const c=current();
    if(screen==='case'&&c&&c.lifecycle!=='closed'&&!pg.querySelector('[data-wait]')){
      pg.querySelector('.case-stage')?.insertAdjacentHTML('afterend',waitCard(c));tr(pg.querySelector('[data-wait]'))}
    if(screen==='home'&&c&&c.lifecycle!=='closed'){const sm=pg.querySelector('.case-glass .cg-title small');if(sm&&!sm.querySelector('[data-wait-home]')){sm.innerHTML=`<span data-wait-home>${L('Ждёт ','Waiting ')}${fmt(since(c))} · #${c.number}</span>`}}
    if(screen==='edit-animal'&&c&&c.lifecycle!=='closed'&&!pg.querySelector('.voice-entry')){
      pg.querySelector('#animal-form')?.insertAdjacentHTML('beforebegin',`<button type="button" class="voice-entry" data-v16="voice"><span class="ve-ico" aria-hidden="true">${I('mic')}</span><span><b>${L('Рассказать голосом','Describe by voice')}</b><small>${L('Скаут разберёт описание и заполнит поля','Scout will read it and fill the fields')}</small></span></button>`);tr(pg.querySelector('.voice-entry'))}
    if(['history','chats','tasks','notifications'].includes(screen)){
      const em=pg.querySelector('.empty');if(em&&EMPTY[screen]){em.outerHTML=emptyHero(screen);tr(pg.querySelector('.empty-hero'))}}
    if(screen==='favorites'){const m=pg.querySelector('.saved-empty .directory-mark');if(m){m.outerHTML=`<div class="eh-scene small">${SCENES.favorites}<img class="eh-scout" src="assets/scout-listening.png" alt=""></div>`}}
    if(screen==='settings'){
      const tog=pg.querySelector('.settings-toggles'),seg=pg.querySelector('.ts-inline .seg');
      if(tog&&!tog.querySelector('[data-v16-toggle]')){
        const row=(k,t,d)=>`<label class="preference-row"><span>${t}<small>${d}</small></span><input type="checkbox" role="switch" data-v16-toggle="${k}" ${S()[k]?'checked':''}></label>`;
        tog.insertAdjacentHTML('beforeend',row('haptics',L('Вибрация отклика','Haptic feedback'),L('Короткий отклик на главные действия','A short buzz on key actions'))+row('autoNight',L('Тёмная тема ночью','Dark theme at night'),L('С 21:00 до 07:00, фото приглушаются','From 21:00 to 07:00, photos are dimmed')));tr(tog)}
      if(seg&&!seg.querySelector('[data-v16="ts-sys"]')){
        seg.insertAdjacentHTML('beforeend',`<button type="button" role="radio" aria-checked="${S().sysText}" class="${S().sysText?'active':''}" data-v16="ts-sys">${L('Авто','Auto')}</button>`);
        if(S().sysText)seg.querySelectorAll('[data-v14^="ts:"]').forEach(k=>{k.classList.remove('active');k.setAttribute('aria-checked','false')});tr(seg)}
    }
  }
  document.addEventListener('change',ev=>{
    const t=ev.target.closest('[data-v16-toggle]');if(!t)return;const s=S(),k=t.dataset.v16Toggle;s[k]=t.checked;persist();
    if(k==='autoNight')applyNight();if(k==='haptics'&&t.checked)buzz(12);
  });
  const renderBeforeV16=render;
  render=function(...a){
    const wasClosed=justClosed;
    const r=renderBeforeV16.apply(this,a);
    tidy();nightWatch();
    if(wasClosed&&screen==='history-case')closingOverlay();
    return r;
  };

  window.podhvat.v16={state:S,parse:parseDesc,phase:phaseOf,format:fmt,tick:refreshWait,buzz,applySys,applyNight,sysScale,emotionFor,openVoice,nightPool,waitCard};
  applySys();applyNight();
  render();
})();

/* ===== src/js/22-v17.js ===== */
/* v17: без дублей; фото, видео и 360° в карточках; карта со всеми случаями; голос и любые файлы в чате;
   скан носа собаки и морды кошки (съёмка, проверка качества, сохранение, сверка, связи с другими экранами). */
(()=>{
  const S=()=>{state.v17??={};const s=state.v17;s.filter??='all';s.colors??=[];s.sel??='park';s.scan??={};s.petScan??=null;s.flow??=null;s.petKind??='face';return s};
  const L=(ru,en)=>T(ru,en);
  const reduced=()=>document.body.classList.contains('reduce-motion')||state.prefs?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROUTE=(id,ru,en,section,desc)=>{if(!SCREEN_REGISTRY.some(s=>s[0]===id))SCREEN_REGISTRY.push([id,ru,en,section,desc])};
  const page=()=>app.querySelector('.screen:not(.screen-outgoing)');
  const tr=n=>{if(lang==='en'&&window.podhvat.i18n&&n)window.podhvat.i18n.translate(n)};
  const buzz=p=>{try{window.podhvat.v16?.buzz(p)}catch{}};
  const pl=(n,ru,en)=>{if(lang!=='ru')return n+' '+(n===1?en[0]:en[1]);const a=n%10,b=n%100;return n+' '+(a===1&&b!==11?ru[0]:a>=2&&a<=4&&(b<10||b>=20)?ru[1]:ru[2])};
  const fmtSize=b=>b<1024?b+' '+L('Б','B'):b<1048576?Math.round(b/1024)+' '+L('КБ','KB'):(b/1048576).toFixed(1).replace('.',',')+' '+L('МБ','MB');
  const sv='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  Object.assign(ICON_PATHS,{
    mic:`<rect ${sv} x="9" y="3" width="6" height="11" rx="3"/><path ${sv} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>`,
    clip:`<path ${sv} d="M20 11.5l-7.6 7.6a5 5 0 0 1-7.1-7.1l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/>`,
    file:`<path ${sv} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path ${sv} d="M14 3v5h5"/>`,
    scan:`<path ${sv} d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle ${sv} cx="12" cy="12" r="3.2"/>`,
    film:`<rect ${sv} x="4" y="5" width="16" height="14" rx="3"/><path ${sv} d="M10.5 9.5l4 2.5-4 2.5z"/>`
  });

  /* ================= 1. Без дублей ================= */
  // а) Скаут не повторяет вопрос, который виден в последних сообщениях.
  const guidedAddBefore=guidedAdd;
  guidedAdd=(role,text,extra={})=>{
    if(role==='scout'&&text&&!extra.type){const last=guidedSession().messages.slice(-4);if(last.some(x=>x.role==='scout'&&x.text===text))return}
    return guidedAddBefore(role,text,extra)};
  // б) Пустой экран: если главный шаг уже есть в карточке, такой же пункт в списке ниже убираем.
  function dedupeActions(pg){
    const hero=pg.querySelector('.empty-hero');if(!hero)return;
    hero.querySelectorAll('[data-go]').forEach(b=>{const t=b.dataset.go;
      pg.querySelectorAll('.scroll-content [data-go="'+t+'"]').forEach(x=>{if(!hero.contains(x))x.remove()})})}

  /* ================= 2. Фото, видео и 360° ================= */
  const NB=()=>[
    {id:'park',colors:['ginger','white'],scene:'park',caseId:'nearby-dog',number:'0319',species:'dog',group:'domestic',x:24,y:36,
     title:L('Собака в парке','Dog in the park'),place:L('Городской парк','City park'),feat:L('Рыжая шерсть, светлая грудь','Ginger fur, light chest'),
     media:[{k:'360',poster:'assets/media/park-360.webp'},{k:'photo',src:'assets/media/park-p1.webp'},{k:'photo',src:'assets/media/park-p2.webp'},{k:'video',poster:'assets/media/park-p1.webp',src:'assets/media/park-v',dur:'0:04'}]},
    {id:'courtyard',colors:['gray','tabby'],scene:'courtyard',caseId:'nearby1',number:'0318',species:'cat',group:'domestic',x:58,y:46,
     title:L('Кошка во дворе','Cat in the courtyard'),place:L('Зелёный двор','Green courtyard'),feat:L('Серая полосатая шерсть','Grey tabby fur'),
     media:[{k:'360',poster:'assets/media/courtyard-360.webp'},{k:'photo',src:'assets/media/courtyard-p1.webp'},{k:'photo',src:'assets/media/courtyard-p2.webp'}]},
    {id:'meadow',colors:['brown'],scene:'meadow',caseId:'nearby-horse',number:'0320',species:'horse',group:'farm',x:78,y:30,
     title:L('Лошадь на лугу','Horse in the meadow'),place:L('Луг у деревни','Meadow near the village'),feat:L('Коричневая шерсть','Brown coat'),
     media:[{k:'360',poster:'assets/media/meadow-360.webp'},{k:'photo',src:'assets/media/meadow-p1.webp'}]},
    {id:'stop',colors:['ginger','beige'],caseId:'nearby-stop',number:'0321',species:'dog',group:'domestic',x:36,y:60,
     title:L('Собака у остановки','Dog at the bus stop'),place:L('Остановка у парка','Stop by the park'),feat:L('Светло-рыжая шерсть, без ошейника','Light ginger fur, no collar'),
     media:[{k:'photo',src:'assets/media/stop-p1.webp'},{k:'photo',src:'assets/media/stop-p2.webp'},{k:'photo',src:'assets/media/stop-p3.webp'},{k:'video',poster:'assets/media/stop-p2.webp',src:'assets/media/stop-v',dur:'0:04'}]},
    {id:'entrance',colors:['gray','tabby','white'],caseId:'nearby-entrance',number:'0322',species:'cat',group:'domestic',x:70,y:62,
     title:L('Кошка у подъезда','Cat by the entrance'),place:L('Двор жилого дома','Residential courtyard'),feat:L('Серая полосатая шерсть, белая грудь','Grey tabby fur, white chest'),
     media:[{k:'photo',src:'assets/media/entrance-p1.webp'},{k:'photo',src:'assets/media/entrance-p2.webp'}]},
    {id:'garage',colors:['gray','tabby'],caseId:'nearby-garage',number:'0323',species:'cat',group:'domestic',x:15,y:54,
     title:L('Кот у гаражей','Cat by the garages'),place:L('Гаражи у пустыря','Garages by the lot'),feat:L('Серый, полосатый','Grey, striped'),
     media:[{k:'video',poster:'assets/media/garage-poster.webp',src:'assets/media/garage-v',dur:'0:04'}]}
  ];
  const kindsOf=n=>({p360:n.media.some(m=>m.k==='360'),photos:n.media.filter(m=>m.k==='photo').length,video:n.media.filter(m=>m.k==='video').length});
  const hasKind=(n,f)=>f==='all'||(f==='360'&&kindsOf(n).p360)||(f==='photo'&&kindsOf(n).photos>0)||(f==='video'&&kindsOf(n).video>0);
  const chipsFor=n=>{const k=kindsOf(n);return `<span class="mk-row">${k.p360?`<span class="mk k360">360°</span>`:''}${k.photos?`<span class="mk">${I('photo')}${k.photos}</span>`:''}${k.video?`<span class="mk">${I('play')}${L('Видео','Video')}</span>`:''}</span>`};
  const nbById=id=>NB().find(n=>n.id===id);
  const nbByCase=cid=>NB().find(n=>n.caseId===cid);
  const FILTERS=()=>[['all',L('Все','All')],['360','360°'],['photo',L('Фото','Photo')],['video',L('Видео','Video')]];
  const filtersHtml=()=>`<div class="n17-filters" role="group" aria-label="${L('Фильтры','Filters')}">${FILTERS().map(([k,n])=>`<button type="button" class="${S().filter===k?'on':''}" aria-pressed="${S().filter===k}" data-n17="filter:${k}">${n}</button>`).join('')}${(()=>{const sel=S().colors,open=!!S().colorsOpen;return `<button type="button" class="n17-ctoggle ${sel.length?'on':''}" aria-expanded="${open}" aria-controls="n17-colors" data-n17="colors-toggle"><span>${L('Окрас','Colour')}</span>${sel.length?`<span class="n17-csel" aria-hidden="true">${sel.slice(0,3).map(id=>colorSwatch(id,'sw')).join('')}${sel.length>3?`<b>+${sel.length-3}</b>`:''}</span>`:''}<i class="n17-chev" aria-hidden="true"></i></button>`})()}${S().colorsOpen?`<div class="n17-colors" id="n17-colors" role="group" aria-label="${L('Окрас','Colour')}">${PET_COLORS.map(([id,ru,en])=>`<button type="button" class="n17-sw ${S().colors.includes(id)?'on':''}" aria-pressed="${S().colors.includes(id)}" aria-label="${L('Окрас: ','Colour: ')}${L(ru,en)}" title="${L(ru,en)}" data-n17="color:${id}">${colorSwatch(id)}</button>`).join('')}</div>`:''}</div>`;
  const visibleNB=()=>NB().filter(n=>hasKind(n,S().filter)&&(!S().colors.length||n.colors.some(c=>S().colors.includes(c))));
  const pinGlyph=n=>{const k=kindsOf(n);return k.p360?'<b>360</b>':k.video&&!k.photos?I('play'):I('photo')};

  function selectNB(n){
    if(n.scene)selectPanorama(n.scene);
    else Object.assign(nearbyCase,{id:n.caseId,number:n.number,name:n.title,nameEN:n.title,group:n.group,species:n.species,publicPlace:n.place,features:n.feat,featuresEN:n.feat,photo:n.media[0].poster||n.media[0].src,synthetic:true});
    S().sel=n.id}

  // Карта: все случаи, тип материалов виден на метке; фильтр по типу.
  const nearbyBefore=V.nearby;
  V.nearby=()=>{
    let h=nearbyBefore(),s=S();
    if(mapFeed){
      const list=visibleNB();
      const cards=list.length?list.map(n=>`<button class="card card-link n17-card" data-n17="open:${n.id}"><img class="animal-photo" src="${n.media[0].poster||n.media[0].src}" alt="${e(n.title)}" loading="lazy"><div class="case-head"><h3>${e(n.title)}</h3></div><p>${e(n.place)} · #${n.number}</p>${chipsFor(n)}</button>`).join(''):`<div class="empty">${L('Таких материалов пока нет','No such media yet')}</div>`;
      return h.replace('data-review="map">Карта','data-review="map">'+L('Карта','Map')).replace(/<button class="card card-link" data-go="nearby-case">[\s\S]*?<\/button>/,filtersHtml()+cards)};
    const list=visibleNB();
    if(s.sel!=='helpers'&&!list.some(n=>n.id===s.sel))s.sel=list[0]?.id||'helpers';
    const pins=list.map(n=>`<button class="map-pin n17-pin ${s.sel===n.id?'selected':''}" data-k="${kindsOf(n).p360?'360':kindsOf(n).video&&!kindsOf(n).photos?'video':'photo'}" style="left:${n.x}%;top:${n.y}%" data-n17="pin:${n.id}" aria-label="${e(n.title)}" aria-pressed="${s.sel===n.id}"><span class="pin-g">${pinGlyph(n)}</span></button>`).join('')
      +`<button class="map-pin n17-pin helper ${s.sel==='helpers'?'selected':''}" data-k="helper" style="left:46%;top:26%" data-n17="pin:helpers" aria-label="${L('Помощники рядом','Helpers nearby')}"><span class="pin-g">${I('user')}</span></button>`;
    let sel;
    if(s.sel==='helpers')sel=`<div class="map-selected"><div class="split"><img class="mini-photo" src="assets/scout.png" alt=""><div><h3>${L('Помощники рядом','Helpers nearby')}</h3><small>${L('Волонтёры и организации','Volunteers and organisations')}</small></div></div><button class="button" data-go="helpers">${L('Подробнее','Details')}</button></div>`;
    else{const n=nbById(s.sel);sel=`<div class="map-selected"><div class="split"><img class="mini-photo" src="${n.media[0].poster||n.media[0].src}" alt="${e(n.title)}"><div><h3>${e(n.title)}</h3><small>${e(n.place)}</small>${chipsFor(n)}</div></div><button class="button" data-n17="open:${n.id}">${L('Открыть карточку','Open the card')}</button></div>`}
    h=h.replace(/<button class="map-pin[\s\S]*?<\/button>/g,'').replace(/<div class="map-selected">[\s\S]*$/,pins+sel);
    return h.replace('<button class="icon-button map-center"',filtersHtml().replace('class="n17-filters"','class="n17-filters on-map"')+'<button class="icon-button map-center"')};

  // Карточка случая рядом: одна галерея вместо «фото + кнопка 360».
  function gallery(n){
    const sl=n.media.map((m,i)=>{
      if(m.k==='360')return `<figure class="mg-slide" data-k="360"><img src="${m.poster}" alt="${e(n.title)}"><button type="button" class="mg-360" data-n17="pano:${n.scene}" aria-label="${L('Осмотреть сцену 360°','Explore the 360° scene')}"><span class="b360">360°</span><b>${L('Осмотреть сцену','Explore the scene')}</b></button></figure>`;
      if(m.k==='video')return `<figure class="mg-slide" data-k="video"><video controls playsinline preload="none" poster="${m.poster}" aria-label="${L('Видео','Video')}"><source src="${m.src}.webm" type="video/webm"><source src="${m.src}.mp4" type="video/mp4"></video></figure>`;
      return `<figure class="mg-slide" data-k="photo"><button type="button" class="mg-photo" data-n17="zoom:${m.src}" aria-label="${L('Открыть фото','Open the photo')}"><img src="${m.src}" alt="${e(n.title)}"></button></figure>`}).join('');
    const th=n.media.map((m,i)=>`<button type="button" class="mg-th ${i?'':'on'}" data-n17="slide:${i}" role="tab" aria-selected="${!i}" aria-label="${m.k==='360'?'360°':m.k==='video'?L('Видео','Video'):L('Фото','Photo')} ${i+1}"><img src="${m.poster||m.src}" alt=""><i class="k">${m.k==='360'?'360°':m.k==='video'?I('play'):''}</i></button>`).join('');
    return `<div class="mg" data-mg><div class="mg-stage"><div class="mg-track" tabindex="0" role="group" aria-label="${L('Фото, видео и 360°','Photos, video and 360°')}">${sl}</div><span class="mg-count" aria-live="polite">1 / ${n.media.length}</span></div>${n.media.length>1?`<div class="mg-thumbs" role="tablist">${th}</div>`:''}</div>`}
  const nearbyCaseBefore=V['nearby-case'];
  V['nearby-case']=()=>{
    const cid=nearbyCase.id,prev=nearbyCaseBefore();let n=nbByCase(cid)||nbById(S().sel)||NB()[0];
    selectNB(n);
    const tail=prev.slice(prev.indexOf('</section>')+10).replace(/favorite:animal:[\w-]+/g,'favorite:animal:'+n.caseId);
    const tag=n.group==='farm'?L('Профильный специалист','Specialist needed'):L('Нужна помощь','Needs help');
    return `<h1>#${n.number} · ${e(n.title)}</h1><section class="card">${gallery(n)}<div class="directory-tags"><span class="badge">${tag}</span><span class="badge">${e(n.place)}</span></div><p>${e(n.feat)}. ${L('Примерная зона наблюдения, без точного адреса.','Approximate observation area, no exact address.')}</p></section>${tail}`};

  // Избранное и задачи: случаи без 360 открываются так же, как со сценой.
  const savedItemBefore=savedItem;
  savedItem=f=>{const n=f.type==='animal'?nbByCase(f.objectId):null;if(!n||n.scene)return savedItemBefore(f);
    return `<section class="card saved-card"><div class="split"><h3>${e(n.title)}</h3><button class="icon-button" data-hub-save="animal:${n.caseId}" aria-label="${L('Удалить животное из избранного','Remove the animal from saved')}">${I('close')}</button></div><p class="caption">${e(n.place)}</p>${chipsFor(n)}<button class="button secondary" data-n17="open:${n.id}">${L('Открыть карточку','Open the card')}</button></section>`};
  const tasksBefore=V.tasks;
  V.tasks=()=>{let h=tasksBefore();const mine=(state.nearbyTasks||[]).filter(t=>!PANORAMA_SCENES.some(s=>s.caseId===t.caseId));
    return h.replace(/<section class="card"><h3>(?:Случай рядом|Case nearby)<\/h3>[\s\S]*?<\/section>/g,()=>{const t=mine.shift();if(!t)return '';const n=nbByCase(t.caseId);
      return `<section class="card"><h3>${e(n?n.title:L('Случай рядом','Case nearby'))}</h3><p>${L('Предложено · ждём ответа','Offered · waiting for a reply')}${n?' · #'+n.number:''}</p><p class="caption">${e(t.deadline||L('Срок уточняется','Deadline to be set'))}</p>${n?`<button class="button secondary" data-n17="open:${n.id}">${L('Открыть карточку','Open the card')}</button>`:''}</section>`})};
  window.addEventListener('submit',ev=>{
    if(ev.target.id!=='offer-form')return;const n=nbByCase(nearbyCase.id);if(!n||n.scene)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    state.nearbyTasks.push({caseId:n.caseId,type:document.getElementById('offer-type').value,deadline:document.getElementById('offer-time').value.trim(),status:'offered'});
    persist();go('tasks');toast(L('Предложение сохранено локально.','The offer is saved locally.'))},true);

  function bindGallery(pg){
    const mg=pg.querySelector('[data-mg]');if(!mg||mg.dataset.bound)return;mg.dataset.bound='1';
    const track=mg.querySelector('.mg-track'),ths=[...mg.querySelectorAll('.mg-th')],count=mg.querySelector('.mg-count'),total=track.children.length;
    let raf=0;
    const sync=()=>{raf=0;const w=track.clientWidth||1,i=Math.max(0,Math.min(total-1,Math.round(track.scrollLeft/w)));
      count.textContent=(i+1)+' / '+total;
      ths.forEach((t,j)=>{t.classList.toggle('on',j===i);t.setAttribute('aria-selected',String(j===i))});
      if(ths[i]&&ths[i].scrollIntoView&&mg.querySelector('.mg-thumbs'))mg.querySelector('.mg-thumbs').scrollTo({left:ths[i].offsetLeft-12,behavior:reduced()?'auto':'smooth'});
      track.querySelectorAll('video').forEach((v,k)=>{if(v.closest('.mg-slide')!==track.children[i])v.pause()});
      mg.dataset.index=String(i)};
    track.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(sync)},{passive:true});
    track.addEventListener('keydown',ev=>{if(ev.key==='ArrowRight'||ev.key==='ArrowLeft'){ev.preventDefault();track.scrollBy({left:(ev.key==='ArrowRight'?1:-1)*track.clientWidth,behavior:reduced()?'auto':'smooth'})}});
    mg.dataset.index='0'}

  /* ================= 3. Чат: голос и любые файлы ================= */
  const composerBefore=composer;
  composer=()=>{let h=composerBefore();if(screen!=='scout')return h;
    h=h.replace(/<button class="icon-button" type="button" data-guided="photo" aria-label="[^"]*">[\s\S]*?<\/button>/,`<button class="icon-button attach-btn" type="button" data-v17="attach" aria-label="${L('Прикрепить файл','Attach a file')}" aria-haspopup="true" aria-expanded="false">${I('clip')}</button>`);
    h=h.replace('<button class="icon-button" type="submit" id="send-message"',`<button class="icon-button mic-btn" type="button" data-v17="mic" aria-label="${L('Голосовой ввод','Voice input')}" aria-pressed="false">${I('mic')}</button><button class="icon-button" type="submit" id="send-message"`);
    h=h.replace('</footer>',`<input id="guided-any" class="hidden" type="file" multiple></footer>`);
    return h};

  function attachSheet(footer){
    footer.querySelector('.attach-sheet')?.remove();
    const items=[['photo','photo',L('Фото','Photo'),L('Снимок с безопасного расстояния','A photo from a safe distance'),'image/*'],
      ['video','film',L('Видео','Video'),L('Короткий ролик, до 25 МБ','A short clip, up to 25 MB'),'video/*'],
      ['file','file',L('Файл','File'),L('Документ, аудио, PDF — любой формат','Document, audio, PDF — any format'),''],
      ['scan','scan',L('Скан носа или морды','Nose or face scan'),L('Для собаки или кошки в текущем случае','For a dog or cat in the current case'),'']];
    const sh=document.createElement('div');sh.className='attach-sheet';sh.setAttribute('role','menu');
    sh.innerHTML=items.map(([k,ic,t,d])=>`<button type="button" role="menuitem" data-v17="pick:${k}"><span class="as-ico">${I(ic)}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('');
    footer.querySelector('.composer').before(sh);tr(sh);
    footer.querySelector('[data-v17="attach"]')?.setAttribute('aria-expanded','true')}
  function closeSheet(){const f=app.querySelector('.guided-footer');f?.querySelector('.attach-sheet')?.remove();f?.querySelector('[data-v17="attach"]')?.setAttribute('aria-expanded','false')}

  const MAXFILE=25*1024*1024;
  async function addFiles(files){
    const s=guidedSession();s.files??=[];let n=0,big=0;
    for(const f of [...files].slice(0,6)){
      if(f.size>MAXFILE){big++;continue}
      try{const id=await storePhoto(f);s.files.push({id,name:f.name,type:f.type||'',size:f.size});
        guidedAdd('self','',{fileId:id,fileName:f.name,fileType:f.type||'',fileSize:f.size});n++}catch{}}
    if(big)toast(L('Файл больше 25 МБ — выберите поменьше.','The file is over 25 MB — choose a smaller one.'));
    if(n){guidedAdd('scout',n===1?L('Файл получил. Я не анализирую содержимое — он прикреплён к карточке.','Got the file. I don’t analyse its contents — it is attached to the card.'):L('Файлы получил. Я не анализирую содержимое — они прикреплены к карточке.','Got the files. I don’t analyse their contents — they are attached to the card.'));buzz(10)}
    persist();render()}
  document.addEventListener('change',ev=>{
    if(ev.target.id!=='guided-any')return;const fs=ev.target.files;if(!fs||!fs.length)return;addFiles(fs).finally(()=>{ev.target.value=''})},true);

  const gmBefore=guidedMessage;
  guidedMessage=m=>{
    if(!m.fileId)return gmBefore(m);const url=chatPhotoCache.get(m.fileId),t=m.fileType||'',nm=e(m.fileName||'');
    const ext=((m.fileName||'').split('.').pop()||'').slice(0,5).toUpperCase();
    let body;
    if(!url)body=`<p>${L('Загружаю файл…','Loading the file…')}</p>`;
    else if(t.startsWith('image/'))body=`<button class="guided-photo" data-guided-photo="${m.fileId}"><img src="${url}" alt="${nm}"><span>${L('Посмотреть фото','View photo')}</span></button>`;
    else if(t.startsWith('video/'))body=`<video class="fm-video" src="${url}" controls playsinline preload="metadata" aria-label="${nm}"></video>`;
    else if(t.startsWith('audio/'))body=`<audio class="fm-audio" src="${url}" controls aria-label="${nm}"></audio>`;
    else body='';
    const cap=`<small class="fm-cap">${nm} · ${fmtSize(m.fileSize||0)}</small>`;
    const card=`<div class="fm-file"><span class="fm-ico">${I('file')}</span><span class="fm-meta"><b>${nm}</b><small>${ext?ext+' · ':''}${fmtSize(m.fileSize||0)}</small></span></div>`;
    return `<article class="guided-message self file-msg" data-file="${m.fileId}">${body?body+(t.startsWith('image/')?'':cap):card}</article>`};

  let hydrating=false;
  async function hydrateFiles(){
    const s=guidedSession(),list=(s.files||[]).filter(f=>!chatPhotoCache.has(f.id)&&!photoPending.has(f.id));
    if(!list.length||hydrating)return;hydrating=true;let changed=false;
    for(const f of list){photoPending.add(f.id);
      try{const db=await photoDB();const blob=await new Promise((res,rej)=>{const r=db.transaction('photos').objectStore('photos').get(f.id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});db.close();
        if(blob){chatPhotoCache.set(f.id,URL.createObjectURL(blob));changed=true}}catch{}finally{photoPending.delete(f.id)}}
    hydrating=false;if(changed&&screen==='scout')render()}

  const guidedCaseBefore=guidedCase;
  guidedCase=()=>{const c=guidedCaseBefore();c.files=[...(guidedSession().files||[])];persist();return c};
  const mediaBefore=V.media;
  V.media=()=>{let h=mediaBefore();const c=current(),fl=(c.files&&c.files.length?c.files:guidedSession().caseId===c.id?guidedSession().files||[]:[]);
    if(!fl.length)return h;
    return h+`<h2 class="v14-h2">${L('Файлы','Files')}</h2><div class="stack">${fl.map(f=>`<div class="fm-file solo"><span class="fm-ico">${I((f.type||'').startsWith('video/')?'film':(f.type||'').startsWith('audio/')?'mic':(f.type||'').startsWith('image/')?'photo':'file')}</span><span class="fm-meta"><b>${e(f.name)}</b><small>${fmtSize(f.size||0)}</small></span></div>`).join('')}</div>`};

  // Сводка «Файлы чата» учитывает и фото, и остальные файлы.
  function filesSummary(pg){
    const thread=pg.querySelector('.guided-thread');if(!thread)return;const s=guidedSession(),files=s.files||[];
    const imgs=[...(s.photos||[]).map(id=>chatPhotoCache.get(id)),...files.filter(f=>(f.type||'').startsWith('image/')).map(f=>chatPhotoCache.get(f.id))].filter(Boolean);
    const total=(s.photos||[]).length+files.length;if(!total)return;
    thread.querySelector('.chat-files')?.remove();
    const other=files.filter(f=>!(f.type||'').startsWith('image/')).length;
    const card=document.createElement('div');card.className='chat-files';
    card.innerHTML=`<div class="cf-head"><b>${L('Файлы чата','Chat files')}</b><small>${pl(total,['файл','файла','файлов'],['file','files'])}</small></div><div class="cf-thumbs">${imgs.slice(0,3).map(u=>`<img src="${u}" alt="">`).join('')}${other?`<span class="cf-more cf-other">${I('file')}${other}</span>`:''}${imgs.length>3?`<span class="cf-more">+${imgs.length-3}</span>`:''}</div>`;
    thread.prepend(card)}

  // Голосовой ввод: диктовка в строку сообщения. Работает там, где браузер даёт распознавание речи.
  let rec=null,micBase='';
  function micUI(on){const b=app.querySelector('[data-v17="mic"]');if(b){b.classList.toggle('live',on);b.setAttribute('aria-pressed',String(on))}
    const f=app.querySelector('.guided-footer');if(!f)return;f.querySelector('.mic-status')?.remove();
    if(on){const st=document.createElement('div');st.className='mic-status';st.setAttribute('role','status');st.innerHTML=`<i></i><span>${L('Слушаю… говорите, текст появится в строке','Listening… speak and the text appears in the field')}</span><button type="button" data-v17="mic" aria-label="${L('Остановить','Stop')}">${I('pause')}</button>`;f.querySelector('.composer').before(st);tr(st)}}
  function stopMic(){const r=rec;rec=null;try{r&&r.stop()}catch{}micUI(false)}
  function startMic(){
    const input=app.querySelector('#message-input');if(!input)return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){toast(L('Голосовой ввод здесь недоступен. Нажмите на микрофон клавиатуры телефона.','Voice input isn’t available here. Use your phone keyboard’s microphone.'));input.focus();return}
    let r;try{r=new SR()}catch{toast(L('Не удалось включить микрофон.','Could not start the microphone.'));return}
    rec=r;r.lang=lang==='ru'?'ru-RU':'en-US';r.interimResults=true;r.continuous=false;micBase=input.value?input.value.trim()+' ':'';
    r.onresult=ev=>{if(rec!==r)return;let t='';for(const x of ev.results)t+=x[0].transcript;
      const inp=app.querySelector('#message-input');if(!inp)return;inp.value=(micBase+t).slice(0,1000);inp.dispatchEvent(new Event('input',{bubbles:true}))};
    r.onerror=ev=>{if(rec!==r)return;const denied=ev.error==='not-allowed'||ev.error==='service-not-allowed';rec=null;micUI(false);
      toast(denied?L('Нет доступа к микрофону. Разрешите его в настройках браузера или напишите текстом.','No microphone access. Allow it in the browser settings or type instead.'):ev.error==='no-speech'?L('Речь не слышна. Попробуйте ещё раз.','No speech heard. Try again.'):L('Распознавание не получилось. Можно написать текстом.','Recognition failed. You can type instead.'))};
    r.onend=()=>{if(rec===r){rec=null;micUI(false);app.querySelector('#message-input')?.focus({preventScroll:true})}};
    try{r.start();micUI(true);buzz(12)}catch{rec=null;micUI(false);toast(L('Не удалось включить микрофон.','Could not start the microphone.'))}}

  /* ================= 4. Скан носа собаки и морды кошки ================= */
  const KIND={dog:'nose',cat:'face'};
  const STEPS=k=>k==='nose'?[L('Нос анфас, крупно','Nose, front, close-up'),L('Нос чуть слева','Nose, slightly left'),L('Нос чуть справа','Nose, slightly right')]:[L('Морда анфас','Face, front'),L('Профиль слева','Profile, left'),L('Профиль справа','Profile, right')];
  const KN=k=>k==='nose'?L('нос','nose'):L('морду','face');
  const TITLE=k=>k==='nose'?L('Скан носа','Nose scan'):L('Скан морды','Face scan');
  const targetKind=t=>t==='pet'?S().petKind:(KIND[current().species]||null);
  const recordOf=t=>t==='pet'?S().petScan:(current().scan||null);
  const GUIDE={
    nose:`<svg viewBox="0 0 200 150" aria-hidden="true" class="ns-guide"><rect x="38" y="20" width="124" height="110" rx="34" class="g-frame"/><path d="M64 66Q64 54 80 52H120Q136 54 136 66Q136 84 118 96Q108 102 100 102Q92 102 82 96Q64 84 64 66Z" class="g-nose"/><path d="M100 92v20" class="g-line"/><path d="M82 72Q74 78 80 87Q90 85 92 77Q90 70 82 72Z" class="g-hole"/><path d="M118 72Q126 78 120 87Q110 85 108 77Q110 70 118 72Z" class="g-hole"/><g class="g-dots"><circle cx="78" cy="60" r="1.6"/><circle cx="90" cy="56" r="1.6"/><circle cx="102" cy="55" r="1.6"/><circle cx="113" cy="57" r="1.6"/><circle cx="123" cy="62" r="1.6"/><circle cx="82" cy="90" r="1.6"/><circle cx="94" cy="96" r="1.6"/><circle cx="106" cy="96" r="1.6"/><circle cx="118" cy="90" r="1.6"/></g><path d="M26 44V28q0-8 8-8h12M174 44V28q0-8-8-8h-12M26 106v16q0 8 8 8h12M174 106v16q0 8-8 8h-12" class="g-corner"/></svg>`,
    face:`<svg viewBox="0 0 200 150" aria-hidden="true" class="ns-guide"><path d="M54 62 48 24l32 18q20-8 40 0l32-18-6 38q10 14 4 32-10 28-50 28t-50-28q-6-18 4-32z" class="g-nose"/><ellipse cx="80" cy="76" rx="7" ry="9" class="g-hole"/><ellipse cx="120" cy="76" rx="7" ry="9" class="g-hole"/><path d="M94 92h12l-6 8z" class="g-line fill"/><path d="M100 100v8M88 112q6 5 12-4 6 9 12 4M62 92l-24-4M62 100l-24 6M138 92l24-4M138 100l24 6" class="g-line"/><path d="M26 44V28q0-8 8-8h12M174 44V28q0-8-8-8h-12M26 106v16q0 8 8 8h12M174 106v16q0 8-8 8h-12" class="g-corner"/></svg>`};

  // Проверка качества кадра считается по самому снимку: резкость, свет, размер.
  async function analyze(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('img'));i.src=url});
      const w=img.naturalWidth,h=img.naturalHeight,side=Math.min(w,h),sx=(w-side)/2,sy=(h-side)/2;
      const N=96,c=document.createElement('canvas');c.width=c.height=N;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,sx,sy,side,side,0,0,N,N);
      const d=cx.getImageData(0,0,N,N).data,g=new Float32Array(N*N);let sum=0;
      for(let i=0;i<N*N;i++){g[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];sum+=g[i]}
      const bright=sum/(N*N);let m=0,m2=0,k=0;
      for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const l=4*g[y*N+x]-g[y*N+x-1]-g[y*N+x+1]-g[(y-1)*N+x]-g[(y+1)*N+x];m+=l;m2+=l*l;k++}
      const sharp=m2/k-(m/k)*(m/k);
      const S2=16,c2=document.createElement('canvas');c2.width=c2.height=S2;const x2=c2.getContext('2d',{willReadFrequently:true});
      x2.drawImage(img,sx+side*.15,sy+side*.15,side*.7,side*.7,0,0,S2,S2);const d2=x2.getImageData(0,0,S2,S2).data,gg=[];let s2=0;
      for(let i=0;i<S2*S2;i++){const v=.299*d2[i*4]+.587*d2[i*4+1]+.114*d2[i*4+2];gg.push(v);s2+=v}
      const avg=s2/(S2*S2);let bits='';for(let i=0;i<S2*S2;i+=4){let n=0;for(let j=0;j<4;j++)n=n*2+(gg[i+j]>avg?1:0);bits+=n.toString(16)}
      const tc=document.createElement('canvas');const tw=160,th=Math.round(160*h/w);tc.width=tw;tc.height=th;tc.getContext('2d').drawImage(img,0,0,tw,th);
      const q={sharp:Math.round(sharp),bright:Math.round(bright),px:Math.min(w,h)};
      q.flags={sharp:sharp>=60,light:bright>=45&&bright<=215,size:q.px>=480};q.ok=q.flags.sharp&&q.flags.light&&q.flags.size;
      return {sig:bits,q,thumb:tc.toDataURL('image/jpeg',.7)};
    }finally{URL.revokeObjectURL(url)}}
  const hamming=(a,b)=>{let d=0;for(let i=0;i<Math.min(a.length,b.length);i++){let x=parseInt(a[i],16)^parseInt(b[i],16);while(x){d+=x&1;x>>=1}}return d};
  function similarity(a,b){if(!a||!b)return null;let best=0;
    for(const fa of a.frames)for(const fb of b.frames){if(!fa.q?.ok||!fb.q?.ok)continue;best=Math.max(best,1-hamming(fa.sig,fb.sig)/(fa.sig.length*4))}
    return best}
  const bucket=v=>v==null?null:v>=.86?['hi',L('Высокое сходство снимков','High similarity of the shots')]:v>=.72?['mid',L('Среднее сходство снимков','Medium similarity of the shots')]:['lo',L('Низкое сходство снимков','Low similarity of the shots')];
  const codeOf=r=>{let h=2166136261;for(const f of r.frames)for(const ch of f.sig){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}const x=(h>>>0).toString(16).padStart(8,'0').toUpperCase();return x.slice(0,4)+'-'+x.slice(4)};

  function flow(){return S().flow}
  function startFlow(target){
    const s=S(),kind=targetKind(target),rec=recordOf(target);
    s.flow={target,kind,step:rec?2:0,cur:0,frames:rec?rec.frames.map(f=>({...f})):[],consent:!!rec,origin:screen};persist();go('nose-scan')}
  function saveRecord(){const f=flow();if(!f)return;
    const rec={kind:f.kind,at:new Date().toISOString(),frames:f.frames.filter(Boolean).map(x=>({sig:x.sig,q:x.q,thumb:x.thumb}))};
    if(f.target==='pet')S().petScan=rec;else current().scan=rec;persist();return rec}

  const dots=f=>`<div class="ns-dots" role="list">${STEPS(f.kind).map((t,i)=>{const fr=f.frames[i];return `<span role="listitem" class="${i===f.cur?'cur':''} ${fr?fr.q.ok?'ok':'bad':''}" aria-label="${t}"></span>`}).join('')}</div>`;
  const qchips=q=>`<div class="chip-row ns-q"><span class="chip ${q.flags.sharp?'yes':'no'}">${I(q.flags.sharp?'check':'close')}${q.flags.sharp?L('Резко','Sharp'):L('Размыто','Blurry')}</span><span class="chip ${q.flags.light?'yes':'no'}">${I(q.flags.light?'check':'close')}${q.flags.light?L('Свет хороший','Good light'):q.bright<45?L('Темно','Too dark'):L('Пересвет','Overexposed')}</span><span class="chip ${q.flags.size?'yes':'no'}">${I(q.flags.size?'check':'close')}${q.flags.size?L('Крупно','Close enough'):L('Мелко','Too small')}</span></div>`;

  V['nose-scan']=()=>{
    const s=S();let f=s.flow;const c=current();
    if(!f||!f.kind&&f.target!=='pet'){f=s.flow={target:'case',kind:KIND[c.species]||null,step:0,cur:0,frames:[],consent:false,origin:'case'}}
    if(!f.kind)return `<h1>${L('Скан носа и морды','Nose and face scan')}</h1><div class="scout-card"><p>${L('Скан доступен для собак и кошек. Для этого животного опирайтесь на фото и приметы.','The scan is available for dogs and cats. For this animal rely on photos and features.')}</p></div>${link(L('Фото и приметы','Photos and features'),'animal','')}`;
    const k=f.kind,pet=f.target==='pet',name=pet?e(state.profile.petName):'';
    const head=`<h1>${TITLE(k)}${pet?' · '+name:''}</h1>`;
    if(f.step===0){
      return `${head}<section class="card ns-hero"><div class="ns-stage">${GUIDE[k]}</div>
        <ul class="ns-tips"><li>${k==='nose'?L('Нос крупно, с расстояния 15–20 см. Подходите, только если собака спокойна.','Nose close-up from 15–20 cm. Approach only if the dog is calm.'):L('Морда анфас с расстояния 30–50 см. Не прижимайте и не удерживайте кошку.','Face front from 30–50 cm. Do not hold or press the cat.')}</li><li>${L('Дневной свет, без вспышки. Три кадра: анфас, чуть слева, чуть справа.','Daylight, no flash. Three shots: front, slightly left, slightly right.')}</li><li>${k==='nose'?L('Если нос влажный — снимайте как есть, не вытирайте.','If the nose is wet, shoot as is — do not wipe it.'):L('Подождите, пока кошка посмотрит в камеру.','Wait until the cat looks at the camera.')}</li></ul></section>
        ${hint(pet?L('Скан питомца поможет сверить находку, если он потеряется. Снимки остаются на этом устройстве.','The pet scan helps verify a find if it gets lost. Shots stay on this device.'):L('Не рискуйте. Если животное напугано, агрессивно или ранено — пропустите скан, это необязательный шаг.','Do not take risks. If the animal is scared, aggressive or hurt, skip the scan — it is optional.'))}
        <label class="preference-row ns-consent"><span>${L('Сохранить скан в карточке','Save the scan in the card')}<small>${L('Показывается только при сверке, не публикуется','Shown only during verification, never published')}</small></span><input type="checkbox" role="switch" data-n17-consent ${f.consent?'checked':''}></label>
        ${pet?`<div class="seg ns-kind" role="radiogroup" aria-label="${L('Вид питомца','Pet species')}">${[['face',L('Кошка','Cat')],['nose',L('Собака','Dog')]].map(([v,n])=>`<button type="button" role="radio" aria-checked="${s.petKind===v}" class="${s.petKind===v?'active':''}" data-n17="kind:${v}">${n}</button>`).join('')}</div>`:''}
        <button class="button" data-n17="scan-start" ${f.consent?'':'disabled'}>${L('Начать съёмку','Start shooting')}</button>`}
    if(f.step===1){
      const st=STEPS(k),fr=f.frames[f.cur],last=f.cur>=2;
      return `${head}<div class="ns-progress"><span class="badge">${L('Кадр','Shot')} ${f.cur+1} / 3</span><b>${st[f.cur]}</b></div>${dots(f)}
        <section class="card ns-hero"><div class="ns-stage ${fr?'has':''}">${fr?`<img src="${fr.thumb}" alt="${st[f.cur]}">`:GUIDE[k]}</div>${fr?qchips(fr.q):''}
        ${fr?(fr.q.ok?`<p class="caption">${L('Кадр подходит.','The shot is good.')}</p>`:`<p class="caption">${L('Лучше переснять: ','Better retake: ')}${[!fr.q.flags.sharp&&L('держите телефон неподвижно','hold the phone still'),!fr.q.flags.light&&(fr.q.bright<45?L('нужно больше света','more light is needed'):L('уберите яркий свет и вспышку','avoid harsh light and flash')),!fr.q.flags.size&&L('подойдите ближе или приблизьте','get closer or zoom in')].filter(Boolean).join('; ')}.</p>`):`<p class="caption">${L('Совместите '+KN(k)+' с рамкой и снимите.','Fit the '+KN(k)+' in the frame and shoot.')}</p>`}</section>
        <div class="stack">${!fr?`<button class="button" data-n17="shoot">${I('photo')}${L('Сделать снимок','Take a photo')}</button><button class="button secondary" data-n17="pickimg">${L('Выбрать из галереи','Choose from gallery')}</button>`
          :fr.q.ok?`<button class="button" data-n17="next">${last?L('Завершить','Finish'):L('Следующий кадр','Next shot')}</button><button class="button secondary" data-n17="retake">${L('Переснять','Retake')}</button>`
          :`<button class="button" data-n17="retake">${L('Переснять','Retake')}</button><button class="button secondary" data-n17="next">${L('Оставить этот кадр','Keep this shot')}</button>`}</div>
        <input id="ns-cam" class="hidden" type="file" accept="image/*" capture="environment"><input id="ns-pick" class="hidden" type="file" accept="image/*">`}
    const rec=recordOf(f.target)||saveRecord(),good=rec.frames.filter(x=>x.q.ok).length,sim=pet?null:similarity(rec,s.petScan),b=bucket(sim);
    return `${head}<section class="card ns-result"><div class="ns-done">${I('check')}<div><h3>${good>=2?L('Запись готова','Record is ready'):L('Запись сохранена, но кадров мало','Saved, but there are few good shots')}</h3><small>${pl(good,['кадр','кадра','кадров'],['shot','shots'])} ${L('годятся из','are good out of')} ${rec.frames.length}</small></div></div>
      <div class="ns-thumbs">${rec.frames.map((x,i)=>`<figure class="${x.q.ok?'ok':'bad'}"><img src="${x.thumb}" alt="${STEPS(rec.kind)[i]||''}"><figcaption>${STEPS(rec.kind)[i]||''}</figcaption></figure>`).join('')}</div>
      <dl class="ns-meta"><div><dt>${L('Код записи','Record code')}</dt><dd>${codeOf(rec)}</dd></div><div><dt>${L('Сохранён','Saved')}</dt><dd>${new Date(rec.at).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short'})}</dd></div></dl>
      ${b?`<div class="ns-sim ${b[0]}">${I('info')}<span><b>${b[1]}</b><small>${L('со сканом питомца','with the pet scan')} ${e(state.profile.petName)}. ${L('Это повод проверить, а не доказательство.','A reason to check, not proof.')}</small></span></div>`:''}
      <p class="caption">${L('Сверка идёт по простым признакам изображения. Это не биометрическая идентификация: сходство — повод проверить, а не доказательство.','Verification uses simple image features. It is not biometric identification: similarity is a reason to check, not proof.')}</p></section>
      <div class="stack">${pet?link(L('К профилю питомца','Back to the pet profile'),'pet',''):link(L('Сверить совпадения','Check matches'),'matches','')}<button class="button secondary" data-n17="rescan">${L('Снять заново','Scan again')}</button><button class="button ghost danger" data-n17="scan-del">${L('Удалить скан','Delete the scan')}</button></div>`};
  ROUTE('nose-scan','Скан носа и морды','Nose and face scan','Случай','Три кадра носа собаки или морды кошки, проверка качества, сохранение в карточке и сверка.');
  const baseTab=tabFor;tabFor=id=>id==='nose-scan'?(flow()?.target==='pet'?'home':'case'):baseTab(id);

  const scanStatus=(t)=>{const r=recordOf(t);return r?L('Готов · ','Ready · ')+pl(r.frames.filter(x=>x.q.ok).length,['кадр','кадра','кадров'],['shot','shots']):L('Не сделан','Not done')};

  /* ---------- Скан в других экранах ---------- */
  function tidy(){
    const pg=page();if(!pg||pg.dataset.v17done)return;pg.dataset.v17done='1';const c=current();
    if(['chats','tasks','history','notifications'].includes(screen))dedupeActions(pg);
    if(screen==='nearby-case'||screen==='nearby'){bindGallery(pg)}
    const canScan=c&&c.lifecycle!=='closed'&&KIND[c.species];
    if(screen==='case'&&canScan&&!pg.querySelector('[data-v17="scan:case"]')){
      const a=pg.querySelector('.stack [data-go="animal"]');
      a?.insertAdjacentHTML('afterend',`<button class="list-row" data-v17="scan:case">${I('scan')}<span>${c.species==='dog'?L('Скан носа','Nose scan'):L('Скан морды','Face scan')}<small>${scanStatus('case')}</small></span><span class="tail">${I('arrow')}</span></button>`);tr(pg.querySelector('[data-v17="scan:case"]'))}
    if(screen==='edit-animal'&&canScan&&!pg.querySelector('.scan-entry')){
      const anchor=pg.querySelector('.voice-entry')||pg.querySelector('#animal-form');
      const html=`<button type="button" class="scan-entry" data-v17="scan:case"><span class="ve-ico" aria-hidden="true">${I('scan')}</span><span><b>${c.species==='dog'?L('Скан носа','Nose scan'):L('Скан морды','Face scan')}</b><small>${recordOf('case')?L('Готов — можно переснять','Ready — you can retake'):L('Три кадра для надёжной сверки','Three shots for reliable matching')}</small></span></button>`;
      if(pg.querySelector('.voice-entry'))anchor.insertAdjacentHTML('afterend',html);else anchor?.insertAdjacentHTML('beforebegin',html);tr(pg.querySelector('.scan-entry'))}
    if(screen==='pet'&&!pg.querySelector('.scan-card')){
      const r=S().petScan,nm=e(state.profile.petName);
      const card=`<section class="card scan-card"><div class="sc-head"><span class="ve-ico" aria-hidden="true">${I('scan')}</span><div><h3>${S().petKind==='nose'?L('Скан носа','Nose scan'):L('Скан морды','Face scan')}</h3><small>${r?L('Готов · ','Ready · ')+pl(r.frames.filter(x=>x.q.ok).length,['кадр','кадра','кадров'],['shot','shots']):L('Не сделан','Not done')}</small></div></div><p>${L('Если '+nm+' потеряется, помощники смогут сверить находку с вашим сканом. Снимки хранятся только на устройстве.','If '+nm+' gets lost, helpers can verify a find against your scan. Shots stay on this device.')}</p><button class="button ${r?'secondary':''}" data-v17="scan:pet">${r?L('Посмотреть или обновить','View or update'):L('Сделать скан','Make a scan')}</button></section>`;
      const stack=pg.querySelector('.stack');stack?stack.insertAdjacentHTML('beforebegin',card):pg.querySelector('.scroll-content')?.insertAdjacentHTML('beforeend',card);tr(pg.querySelector('.scan-card'))}
    if(screen==='lost-report'&&S().petScan&&!pg.querySelector('.scan-attached')){
      pg.querySelector('form')?.insertAdjacentHTML('beforebegin',`<div class="ns-sim hi scan-attached">${I('scan')}<span><b>${L('Скан питомца приложен','The pet scan is attached')}</b><small>${L('Помощники смогут сверить находку с ним. Сам скан не публикуется.','Helpers can verify a find against it. The scan itself is never published.')}</small></span></div>`);tr(pg.querySelector('.scan-attached'))}
    if(screen==='scanner'){
      const h=pg.querySelector('.hint,.notice');if(h&&/биометр|biometric/i.test(h.textContent))h.textContent=L('Скан носа и морды сохраняет снимки и сверяет их по простым признакам изображения. Это не биометрическая идентификация; точность нужно проверять отдельно.','The nose and face scan keeps the shots and compares them by simple image features. It is not biometric identification; accuracy needs separate validation.');
      if(canScan&&!pg.querySelector('[data-v17="scan:case"]'))pg.querySelector('.scout-card')?.insertAdjacentHTML('afterend',`<button class="list-row" data-v17="scan:case">${I('scan')}<span>${c.species==='dog'?L('Скан носа','Nose scan'):L('Скан морды','Face scan')}<small>${scanStatus('case')}</small></span><span class="tail">${I('arrow')}</span></button>`);tr(pg)}
    if(screen==='matches'){
      const r=c.scan,pr=S().petScan,sim=similarity(r,pr),b=bucket(sim);let html='';
      if(canScan&&!r)html=`<section class="card scan-card"><div class="sc-head"><span class="ve-ico" aria-hidden="true">${I('scan')}</span><div><h3>${L('Сверка по скану','Scan verification')}</h3><small>${L('Скан не сделан','No scan yet')}</small></div></div><p>${c.species==='dog'?L('Три кадра носа помогут владельцу узнать собаку по скану.','Three shots of the nose help an owner recognise the dog by scan.'):L('Три кадра морды помогут владельцу узнать кошку по скану.','Three shots of the face help an owner recognise the cat by scan.')}</p><button class="button" data-v17="scan:case">${L('Сделать скан','Make a scan')}</button></section>`;
      else if(r)html=`<section class="card scan-card"><div class="sc-head"><span class="ve-ico" aria-hidden="true">${I('scan')}</span><div><h3>${L('Сверка по скану','Scan verification')}</h3><small>${L('Скан готов · код ','Scan ready · code ')}${codeOf(r)}</small></div></div>${b?`<div class="ns-sim ${b[0]}">${I('info')}<span><b>${b[1]}</b><small>${L('со сканом питомца','with the pet scan')} ${e(state.profile.petName)}. ${L('Это повод проверить, а не доказательство.','A reason to check, not proof.')}</small></span></div>`:`<p>${L('У заявителей в этой выдаче нет сканов. Скан питомца у владельца ускорит сверку.','Claimants in this list have no scans. An owner’s pet scan speeds up verification.')}</p>`}<button class="button secondary" data-v17="scan:case">${L('Посмотреть скан','View the scan')}</button></section>`;
      if(html){const first=pg.querySelector('.match-card,.card');first?first.insertAdjacentHTML('beforebegin',html):pg.querySelector('.scroll-content')?.insertAdjacentHTML('beforeend',html);tr(pg.querySelector('.scan-card'))}}
    if(screen==='match'){
      const sim=similarity(c.scan,S().petScan),b=bucket(sim);
      [...pg.querySelectorAll('.trait')].forEach(t=>{if(/ID-слепок|ID record/.test(t.textContent)){t.innerHTML=`<small>${L('Скан','Scan')}</small>${b?b[1].replace(/ снимков| of the shots/,''):c.scan?L('Нет скана заявителя','No claimant scan'):L('Нет скана','No scan')}`}})}
  }

  document.addEventListener('change',ev=>{
    const t=ev.target;
    if(t.matches&&t.matches('[data-n17-consent]')){const f=flow();if(f){f.consent=t.checked;persist();const b=page()?.querySelector('[data-n17="scan-start"]');if(b)b.disabled=!t.checked}return}
    if(t.id==='ns-cam'||t.id==='ns-pick'){const file=t.files&&t.files[0];if(!file)return;const f=flow();if(!f)return;
      analyze(file).then(r=>{f.frames[f.cur]=r;persist();buzz(r.q.ok?[10]:[18,40,18]);render()}).catch(()=>toast(L('Не удалось открыть снимок. Выберите другое фото.','Could not open the shot. Choose another photo.')))}
  },true);

  /* ---------- Обработчики ---------- */
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-n17],[data-v17]');
    if(!b){if(!ev.target.closest('.attach-sheet,[data-v17="attach"]'))closeSheet();return}
    const s=S();
    if(b.dataset.v17){const [a,p]=b.dataset.v17.split(':');ev.preventDefault();ev.stopPropagation();
      switch(a){
        case'attach':{const f=app.querySelector('.guided-footer');if(!f)break;if(f.querySelector('.attach-sheet'))closeSheet();else attachSheet(f);break}
        case'pick':{closeSheet();const inp=app.querySelector('#guided-any');
          if(p==='scan'){const c=current();if(!c||!KIND[c.species]){toast(L('Скан доступен для собак и кошек. Сохраните карточку случая, когда вид известен.','The scan is for dogs and cats. Save the case card once the species is known.'));break}
            startFlow('case');break}
          if(!inp)break;inp.accept=p==='photo'?'image/*':p==='video'?'video/*':'';inp.click();break}
        case'mic':if(rec)stopMic();else startMic();break;
        case'scan':startFlow(p);break;
      }return}
    const [a,...rest]=b.dataset.n17.split(':'),p=rest.join(':');ev.preventDefault();ev.stopPropagation();
    switch(a){
      case'filter':s.filter=p;persist();render();break;
      case'colors-toggle':s.colorsOpen=!s.colorsOpen;persist();render();break;
      case'color':s.colors=s.colors.includes(p)?s.colors.filter(x=>x!==p):[...s.colors,p];persist();render();break;
      case'pin':s.sel=p;persist();render();break;
      case'open':{const n=nbById(p);if(n){selectNB(n);go('nearby-case')}break}
      case'pano':selectPanorama(p);go('panorama');break;
      case'slide':{const mg=b.closest('[data-mg]'),tk=mg.querySelector('.mg-track');tk.scrollTo({left:(+p)*tk.clientWidth,behavior:reduced()?'auto':'smooth'});break}
      case'zoom':openModal(L('Фото','Photo'),`<img src="${p}" style="width:100%;max-height:65vh;object-fit:contain" alt="">`,button(L('Закрыть','Close'),'dismiss','secondary'));break;
      case'kind':{s.petKind=p;if(s.flow)s.flow.kind=p;persist();render();break}
      case'scan-start':{const f=flow();if(f&&f.consent){f.step=1;f.cur=0;persist();render()}break}
      case'shoot':page()?.querySelector('#ns-cam')?.click();break;
      case'pickimg':page()?.querySelector('#ns-pick')?.click();break;
      case'retake':{const f=flow();if(f){delete f.frames[f.cur];persist();render()}break}
      case'next':{const f=flow();if(!f)break;if(f.cur<2){f.cur++;persist();render()}else{f.step=2;f.frames=f.frames.filter(Boolean);saveRecord();render()}break}
      case'rescan':{const f=flow();if(f){f.step=0;f.cur=0;f.frames=[];persist();render()}break}
      case'scan-del':{const f=flow();if(!f)break;if(f.target==='pet')s.petScan=null;else delete current().scan;s.flow=null;persist();toast(L('Скан удалён с этого устройства.','The scan is deleted from this device.'));go(f.target==='pet'?'pet':'case');break}
    }},true);

  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeSheet()});

  /* ---------- Подключение к render ---------- */
  const renderBefore=render;
  render=function(...a){
    if(rec&&screen!=='scout')stopMic();
    const r=renderBefore.apply(this,a);
    const pg=page();
    if(pg){tidy();if(screen==='scout'){filesSummary(pg);hydrateFiles()}if(screen==='nearby-case')bindGallery(pg)}
    return r};

  Object.assign(window.podhvat,{v17:{open:id=>{const n=NB().find(x=>x.id===id);if(n){selectNB(n);go('nearby-case')}},state:S,nb:NB,kindsOf,analyze,similarity,bucket,codeOf,startFlow,addFiles,startMic,stopMic}});
  render();
})();

/* ===== src/js/23-v18.js ===== */
/* v18: профили помощников без путаницы (лайк на фото, «Связаться», галерея, компактные достижения,
   фото в услугах), заметки в избранном. */
(()=>{
  const S=()=>{state.v18??={};const s=state.v18;s.notes??={};return s};
  const L=(ru,en)=>T(ru,en);
  const reduced=()=>document.body.classList.contains('reduce-motion')||state.prefs?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page=()=>app.querySelector('.screen:not(.screen-outgoing)');
  const tr=n=>{if(lang==='en'&&window.podhvat.i18n&&n)window.podhvat.i18n.translate(n)};
  const tpl=h=>{const t=document.createElement('template');t.innerHTML=h;return t};
  const buzz=p=>{try{window.podhvat.v16?.buzz(p)}catch{}};
  const hasPhoto=n=>{try{return ART.photos.has(n)}catch{return false}};

  /* ================= Профиль помощника ================= */
  const ACH_TEXT=[
    [/ответ|repl/i,L('Отвечает на запросы быстрее среднего по сервису.','Replies to requests faster than the service average.')],
    [/передерж|stay/i,L('Столько передержек завершено в Подхвате. Число считается по закрытым задачам.','This many foster stays were completed in Podhvat. Counted from closed tasks.')],
    [/провер|verif/i,L('Контакты и личность подтверждены командой сервиса. Телефон открывается только по согласию обеих сторон.','Contacts and identity were confirmed by the service team. The phone opens only with both sides’ consent.')],
    [/поездк|ride/i,L('Столько поездок с животными завершено в Подхвате.','This many rides with animals were completed in Podhvat.')],
    [/вовремя|on time/i,L('Приезжает к назначенному времени в большинстве поездок.','Arrives at the agreed time on most rides.')],
    [/опыт|expert/i,L('Есть опыт работы с собаками, в том числе с напуганными.','Has experience with dogs, including frightened ones.')],
    [/поиск|search/i,L('Столько поисков хозяина завершено с участием помощника.','This many owner searches were completed with the helper’s part.')],
    [/октябр|october/i,L('Сезонное отличие за помощь в октябре.','A seasonal mark for helping in October.')],
    [/приют|shelter|клиник|clinic|круглос|24/i,L('Организация работает по заявленному графику.','The organisation keeps to its stated schedule.')]
  ];
  const achText=n=>(ACH_TEXT.find(([re])=>re.test(n))||[0,L('Отличие выдаётся за подтверждённые действия в Подхвате.','A mark given for confirmed actions in Podhvat.')])[1];

  const galleryFor=(h,cover,kinds)=>{
    const real=[1,2,3,4].map(i=>`${h.id}-g${i}`).filter(hasPhoto).map(n=>'assets/photos/'+n+'.webp');
    if(real.length)return real.map(src=>({src}));
    const out=[{src:cover},{src:cover,crop:'a'}];
    kinds.slice(0,2).forEach(k=>out.push({src:ART.prod(k),tile:true}));
    return out};

  const helperBefore=V.helper;
  V.helper=()=>{
    const html=helperBefore(),h=helper();const t=tpl(html),f=t.content,pg=f.querySelector('.helper-page');
    if(!h||!pg)return html;
    const c=activeHelpCase();
    // --- что было в «Ещё» и внизу
    const keep={chat:null,intake:null};
    pg.querySelectorAll('details.h-more').forEach(d=>{
      const sum=d.querySelector('summary')?.textContent.trim();
      if(/^(Ещё|More)$/.test(sum)){keep.chat=d.querySelector('[data-action^="open-chat"]');keep.intake=d.querySelector('[data-action="confirm-intake"]');d.remove()}});
    pg.querySelectorAll('[data-hub-helper-ask],[data-action^="favorite:service"]').forEach(n=>n.remove());
    pg.querySelectorAll('.stack').forEach(s=>{
      s.querySelectorAll('[data-hub-save]').forEach(n=>n.remove());
      keep.chat??=s.querySelector('[data-action^="open-chat"]');keep.intake??=s.querySelector('[data-action="confirm-intake"]');
      s.querySelectorAll('[data-action^="open-chat"],[data-action="confirm-intake"]').forEach(n=>n.remove());
      if(!s.children.length)s.remove()});
    // --- обложка: галерея и лайк в углу
    const cover=pg.querySelector('.h-cover img')?.getAttribute('src')||ART.cover(h.id);
    const kinds=[...pg.querySelectorAll('[data-v15^="want:"]')].map(b=>b.dataset.v15.split(':')[2]).filter((k,i,a)=>a.indexOf(k)===i);
    const slides=galleryFor(h,cover,kinds.length?kinds:ART.kinds);
    const saved=isSaved(h.kind,h.id);
    const covEl=pg.querySelector('.h-cover');
    if(covEl){
      covEl.classList.add('h-gal');
      covEl.innerHTML=`<div class="h-gtrack" tabindex="0" role="group" aria-label="${L('Фото профиля','Profile photos')}">${slides.map((s,i)=>`<figure class="h-gslide ${s.tile?'tile':''} ${s.crop?'crop-'+s.crop:''}"><img src="${s.src}" alt="" ${i?'loading="lazy"':''}></figure>`).join('')}</div>`
        +(slides.length>1?`<div class="h-gdots" aria-hidden="true">${slides.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div><span class="h-gcount">1 / ${slides.length}</span>`:'')
        +`<button class="icon-button h-like ${saved?'saved':''}" data-hub-save="${h.kind}:${h.id}" aria-pressed="${saved}" aria-label="${saved?L('Убрать из избранного','Remove from saved'):L('В избранное','Add to saved')}">${I('heart')}</button>`}
    // --- достижения: компактный ряд внахлёст
    const ach=[...pg.querySelectorAll('.h-ach-item')].map(n=>({svg:n.querySelector('span')?.innerHTML||'',name:n.querySelector('small')?.textContent.trim()||''}));
    const achSec=pg.querySelector('.h-ach')?.closest('.h-sec');
    if(achSec&&ach.length){
      achSec.classList.add('h-ach-sec');
      achSec.innerHTML=`<div class="h-ach-row"><h3>${L('Достижения','Achievements')}</h3><div class="h-ach2" role="list">${ach.map((a,i)=>`<button type="button" role="listitem" class="h-ach2-i" style="--z:${ach.length-i}" data-v18="ach:${i}" aria-label="${e(a.name)}" data-name="${e(a.name)}">${a.svg}</button>`).join('')}</div></div>`}
    // --- услуги: фото в карточках
    const svc=pg.querySelector('.h-serv');
    if(svc){
      const ks=kinds.length?kinds:ART.kinds;
      svc.classList.add('h-svcs');
      [...svc.children].forEach((li,i)=>{
        const real=[1,2,3].map(j=>`${h.id}-s${i+1}-${j}`).filter(hasPhoto).map(n=>'assets/photos/'+n+'.webp');
        const imgs=real.length?real:[0,1,2].slice(0,i===0?3:2).map(j=>ART.prod(ks[(i+j)%ks.length]));
        li.classList.add('h-svc');
        li.insertAdjacentHTML('beforeend',`<div class="hs-ph">${imgs.map((src,j)=>`<button type="button" data-v18="zoom:${e(src)}" aria-label="${L('Фото услуги','Service photo')} ${j+1}"><img src="${src}" alt="" loading="lazy"></button>`).join('')}</div>`)})}
    // --- связь: одна кнопка вместо трёх
    const hasChat=!!(c&&c.chats[h.id]);
    const contact=`<div class="stack mt h-actions"><button class="button secondary h-contact" data-v18="contact:${h.id}">${I('chat')}${hasChat?L('Открыть диалог','Open the conversation'):L('Связаться','Get in touch')}</button>${keep.intake?keep.intake.outerHTML:''}</div>`;
    pg.insertAdjacentHTML('beforeend',contact);
    // убрать жирную подпись роли из имени, если роль уже в метке
    return t.innerHTML};

  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-v18]');if(!b)return;
    const [a,...r]=b.dataset.v18.split(':'),p=r.join(':');ev.preventDefault();ev.stopPropagation();
    switch(a){
      case'ach':{const n=b.dataset.name;openModal(e(n),e(achText(n)),button(L('Закрыть','Close'),'dismiss','secondary'));break}
      case'zoom':openModal(L('Фото','Photo'),`<img src="${p}" style="width:100%;max-height:60vh;object-fit:contain;border-radius:18px" alt="">`,button(L('Закрыть','Close'),'dismiss','secondary'));break;
      case'contact':{const h=helpers.find(x=>x.id===p),c=activeHelpCase(),nm=e(lang==='ru'?h.name:h.en);
        if(!c||c.lifecycle==='closed'){openModal(L('Связаться','Get in touch'),L('Переписка идёт в рамках случая: так помощник видит, о каком животном речь. Опишите ситуацию — Скаут соберёт карточку.','Messages belong to a case, so the helper sees which animal it is about. Describe the situation and Scout will build the card.'),button(L('Начать случай','Start a case'),'go-scout','')+button(L('Закрыть','Close'),'dismiss','secondary'));break}
        if(c.chats[h.id]){go('chat');helperId=h.id;state.currentChat=h.id;persist();render();break}
        openModal(L('Связаться','Get in touch')+' · '+nm,L('Сообщение попадёт в диалог по случаю #','The message goes to the conversation for case #')+e(c.number)+'. '+L('Это не запрос о помощи: запрос и согласие на контакты — отдельные шаги.','This is not a help request: the request and the consent to contacts are separate steps.'),button(L('Написать','Write a message'),'contact-chat:'+h.id,'')+button(L('Закрыть','Close'),'dismiss','secondary'));break}
      case'nedit':editNote(p);break;
      case'nnew':editNote('free:'+Date.now());break;
      case'ntag':{const d=draft();d.tags=d.tags.includes(p)?d.tags.filter(x=>x!==p):[...d.tags,p];render();break}
      case'ndue':{const d=draft();if(p==='none'){d.due=null;d.dueTok=null}else{const o=DUES().find(x=>x[0]===p);if(o){d.due=o[2].toISOString();d.dueTok=p}}render();break}
      case'nsave':saveNote();break;
      case'ncancel':noteEdit=null;noteDraft=null;render();break;
      case'ndel':{delete S().notes[p];persist();noteEdit=null;noteDraft=null;render();break}
      case'ndone':{const n=S().notes[p];if(n){n.done=!n.done;persist();render()}break}
    }},true);
  // кнопки модального окна с собственными действиями
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
    if(a==='go-scout'){ev.stopImmediatePropagation();ev.preventDefault();if(modal.open)closeModal();go('scout')}
    else if(a.startsWith('contact-chat:')){ev.stopImmediatePropagation();ev.preventDefault();const id=a.slice(13);helperId=id;ensureChat(id);if(modal.open)closeModal();state.currentChat=id;persist();go('chat')}
  },true);

  // листание галереи профиля: точки и счётчик
  function bindGallery(pg){
    pg.querySelectorAll('.h-gal').forEach(g=>{
      if(g.dataset.bound)return;g.dataset.bound='1';const tk=g.querySelector('.h-gtrack'),dots=[...g.querySelectorAll('.h-gdots i')],cnt=g.querySelector('.h-gcount');if(!tk||!dots.length)return;
      let raf=0;tk.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const i=Math.max(0,Math.min(dots.length-1,Math.round(tk.scrollLeft/(tk.clientWidth||1))));dots.forEach((d,j)=>d.classList.toggle('on',j===i));if(cnt)cnt.textContent=(i+1)+' / '+dots.length})},{passive:true});
      tk.addEventListener('keydown',ev=>{if(ev.key==='ArrowRight'||ev.key==='ArrowLeft'){ev.preventDefault();tk.scrollBy({left:(ev.key==='ArrowRight'?1:-1)*tk.clientWidth,behavior:reduced()?'auto':'smooth'})}})})}

  /* ================= Заметки в избранном ================= */
  const TAGS=()=>[['call',L('Позвонить','Call')],['discuss',L('Обсудить','Discuss')],['fits',L('Подходит','Fits')],['nofit',L('Не подходит','Does not fit')],['key',L('Важно','Important')]];
  const tagName=k=>(TAGS().find(x=>x[0]===k)||[0,k])[1];
  let noteEdit=null,noteDraft=null;
  const draft=()=>noteDraft??={text:'',tags:[],done:false,due:null};
  function editNote(key){noteEdit=key;const n=S().notes[key];noteDraft=n?{text:n.text,tags:[...n.tags],done:!!n.done,due:n.due||null}:{text:'',tags:[],done:false,due:null};render();setTimeout(()=>app.querySelector('#fav-note-text')?.focus({preventScroll:false}),60)}
  function saveNote(){const d=draft(),text=(page()?.querySelector('#fav-note-text')?.value??d.text).trim();
    if(!text&&!d.tags.length){toast(L('Напишите заметку или выберите отметку.','Write a note or pick a mark.'));return}
    S().notes[noteEdit]={text,tags:d.tags,done:d.done,due:d.due||null,at:new Date().toISOString()};persist();noteEdit=null;noteDraft=null;buzz(8);render();toast(L('Заметка сохранена.','Note saved.'))}
  document.addEventListener('input',ev=>{if(ev.target.id==='fav-note-text'&&noteDraft)noteDraft.text=ev.target.value});
  document.addEventListener('change',ev=>{if(ev.target.id==='fav-note-due'&&noteDraft){const v=ev.target.value;noteDraft.due=v?new Date(v).toISOString():null;noteDraft.dueTok=null;render()}});
  /* напоминания: срок у заметки */
  const pad=n=>String(n).padStart(2,'0');
  const atHour=(add,h)=>{const d=new Date();d.setDate(d.getDate()+add);d.setHours(h,0,0,0);return d};
  const DUES=()=>{const now=new Date(),o=[['h1',L('Через час','In an hour'),new Date(now.getTime()+3600e3)]];
    if(now.getHours()<18)o.push(['eve',L('Сегодня вечером','This evening'),atHour(0,19)]);
    o.push(['tm',L('Завтра утром','Tomorrow morning'),atHour(1,9)],['d3',L('Через 3 дня','In 3 days'),atHour(3,9)]);return o};
  const fmtDue=iso=>{const d=new Date(iso),now=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(d)-day(now))/864e5),t=pad(d.getHours())+':'+pad(d.getMinutes());
    if(diff===0)return L('сегодня','today')+' '+t;if(diff===1)return L('завтра','tomorrow')+' '+t;if(diff===-1)return L('вчера','yesterday')+' '+t;
    return d.toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short'})+' '+t};
  const localInput=iso=>{if(!iso)return '';const d=new Date(iso);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())};
  const dueBlock=d=>`<div class="fav-due"><b>${L('Напомнить','Remind me')}</b><div class="fav-tags" role="group" aria-label="${L('Когда напомнить','When to remind')}"><button type="button" class="${!d.due?'on':''}" aria-pressed="${!d.due}" data-v18="ndue:none">${L('Не нужно','No reminder')}</button>${DUES().map(([k,n])=>`<button type="button" class="${d.dueTok===k?'on':''}" aria-pressed="${d.dueTok===k}" data-v18="ndue:${k}">${n}</button>`).join('')}</div><label class="field fav-due-in"><span>${L('Своё время','Pick a time')}</span><input type="datetime-local" id="fav-note-due" value="${localInput(d.due)}"></label></div>`;
  const editor=(key)=>{const d=draft(),has=!!S().notes[key];
    return `<div class="fav-editor" data-key="${e(key)}"><label class="field">${L('Заметка','Note')}<textarea id="fav-note-text" maxlength="400" rows="3" placeholder="${L('Например: позвонить после 18:00','For example: call after 6 pm')}">${e(d.text)}</textarea></label><div class="fav-tags" role="group" aria-label="${L('Отметки','Marks')}">${TAGS().map(([k,n])=>`<button type="button" class="${d.tags.includes(k)?'on':''}" aria-pressed="${d.tags.includes(k)}" data-v18="ntag:${k}">${n}</button>`).join('')}</div>${dueBlock(d)}<div class="fav-ed-actions"><button type="button" class="button" data-v18="nsave">${L('Сохранить','Save')}</button><button type="button" class="button secondary" data-v18="ncancel">${L('Отмена','Cancel')}</button>${has?`<button type="button" class="button ghost danger" data-v18="ndel:${e(key)}">${L('Удалить заметку','Delete the note')}</button>`:''}</div></div>`};
  const noteView=(key,n,{title}={})=>`<div class="fav-note ${n.done?'done':''}" data-key="${e(key)}">${title?`<b class="fn-title">${title}</b>`:''}${n.text?`<p>${e(n.text)}</p>`:''}${n.tags.length?`<div class="fav-tags ro">${n.tags.map(k=>`<span>${e(tagName(k))}</span>`).join('')}</div>`:''}${n.due?`<p class="fn-due ${!n.done&&new Date(n.due)<new Date()?'late':''}">${I('bell')}<span>${!n.done&&new Date(n.due)<new Date()?L('Просрочено','Overdue')+' · ':L('Напомнить','Remind')+': '}${fmtDue(n.due)}</span></p>`:''}<div class="fn-actions"><button type="button" class="fn-done" role="checkbox" aria-checked="${!!n.done}" data-v18="ndone:${e(key)}">${I('check')}<span>${L('Сделано','Done')}</span></button><button type="button" class="fn-edit" data-v18="nedit:${e(key)}">${I('edit')}<span>${L('Изменить','Edit')}</span></button></div></div>`;

  const titleOf=key=>{const [type,id]=key.split(':');
    if(type==='free')return L('Свободная заметка','Free note');
    if(type==='article'){const a=SELF_HELP.find(a=>a.id===id);return a?e(a.title):L('Статья','Article')}
    if(type==='animal'){const n=window.podhvat.v17?.nb().find(x=>x.caseId===id);if(n)return e(n.title);const c=state.cases.find(c=>c.id===id);return c?e(name(c)):L('Животное','Animal')}
    const h=helpers.find(x=>x.id===id);return h?e(lang==='ru'?h.name:h.en):L('Карточка','Card')};
  const fmtDate=at=>new Date(at).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short'});

  const favBefore=V.favorites;
  V.favorites=()=>{
    let h=favBefore();const n=Object.keys(S().notes).length;
    const chip=`<button data-hub-saved-filter="notes" class="${savedFilter==='notes'?'selected':''}" aria-pressed="${savedFilter==='notes'}">${L('Заметки','Notes')}${n?' · '+n:''}</button>`;
    h=h.replace('</nav>',chip+'</nav>');
    if(savedFilter!=='notes')return h;
    const head=h.slice(0,h.indexOf('</nav>')+6);
    const keys=Object.keys(S().notes).sort((a,b)=>new Date(S().notes[b].at)-new Date(S().notes[a].at));
    const isNew=noteEdit&&noteEdit.startsWith('free:')&&!S().notes[noteEdit];
    return head+`<button class="button" data-v18="nnew">${I('edit')}${L('Новая заметка','New note')}</button>`
      +(isNew?`<section class="card fav-card">${editor(noteEdit)}</section>`:'')
      +(keys.length?keys.map(k=>`<section class="card fav-card"><small class="fn-src">${titleOf(k)} · ${fmtDate(S().notes[k].at)}</small>${noteEdit===k?editor(k):noteView(k,S().notes[k])}</section>`).join(''):(!isNew?`<section class="card fav-empty"><h3>${L('Здесь пока пусто','Nothing here yet')}</h3><p>${L('Записывайте, кому позвонить и что не забыть. Заметку можно привязать к карточке в избранном или оставить свободной.','Jot down who to call and what not to forget. A note can belong to a saved card or stay free.')}</p></section>`:''));
  };

  /* ================= Аудит логики: один путь к одному месту ================= */
  // Маскот Скаута на главной — иллюстрация: вход в Скаута уже есть в кнопке «Попросить помощи».
  const homeBefore=V.home;
  V.home=()=>homeBefore().replace(/<button class="home-scout-art"([^>]*?)\sdata-go="scout"([^>]*)>([\s\S]*?)<\/button>/,'<div class="home-scout-art" aria-hidden="true"$1$2>$3</div>');
  // Если крупная кнопка шага уже ведёт на экран, строка списка и чип с тем же адресом убираются.
  function dedupeDest(pg){
    const main=new Set([...pg.querySelectorAll('button.button[data-go],a.button[data-go]')].map(n=>n.dataset.go));
    pg.querySelectorAll('[data-go]').forEach(n=>{
      if(n.classList.contains('button')||n.closest('.app-header,.dock'))return;
      if(main.has(n.dataset.go)&&(n.classList.contains('list-row')||n.closest('.stage-links,.case-links,.scroll-content>button')||!n.className||n.matches('button:not([class])')))n.remove()});
    // на экране случая стрелка карточки и чип «+N» повторяют строки списка ниже
    if(screen==='case'){
      pg.querySelectorAll('.cg-arrow[data-go="route"],.cg-more[data-go="animal"]').forEach(n=>{
        const to=n.dataset.go;if(pg.querySelector('.list-row[data-go="'+to+'"]'))n.remove()})}}

  // Заметка под каждой сохранённой карточкой
  function tidy(){
    const pg=page();if(!pg||pg.dataset.v18done)return;pg.dataset.v18done='1';
    if(screen==='case'||screen==='home')dedupeDest(pg);
    // одна главная (лаймовая) кнопка на экране: остальные — вторичные
    if(screen==='case'||screen==='pet'){const prim=[...pg.querySelectorAll('.button:not(.secondary):not(.dark):not(.ghost):not(.danger)')].filter(n=>!n.closest('.case-next'));
      const hasMain=pg.querySelector('.case-next .button');prim.slice(hasMain?0:1).forEach(n=>n.classList.add('secondary'))}
    if(screen==='helper')bindGallery(pg);
    if(screen==='favorites'&&savedFilter!=='notes'){
      pg.querySelectorAll('.saved-card').forEach(card=>{
        const key=card.querySelector('[data-hub-save]')?.dataset.hubSave;if(!key||card.querySelector('.fav-note-wrap'))return;
        const n=S().notes[key];let inner;
        if(noteEdit===key)inner=editor(key);
        else if(n)inner=noteView(key,n);
        else inner=`<button type="button" class="fav-add" data-v18="nedit:${e(key)}">${I('edit')}${L('Добавить заметку','Add a note')}</button>`;
        card.insertAdjacentHTML('beforeend',`<div class="fav-note-wrap">${inner}</div>`)});
      tr(pg)}
    if(screen==='favorites'&&savedFilter==='notes')tr(pg);
  }

  const renderBefore=render;
  render=function(...a){const r=renderBefore.apply(this,a);tidy();const pg=page();if(pg&&screen==='helper')bindGallery(pg);if(screen!=='favorites'&&noteEdit){noteEdit=null;noteDraft=null}return r};

  Object.assign(window.podhvat,{v18:{state:S,achText,fmtDue}});
  render();
})();

/* ===== src/js/24-v19.js ===== */
/* v19: ответы помощника в чате, напоминания у заметок, сортировка и сравнение помощников,
   сверка скана со случаями рядом. */
(()=>{
  const S=()=>{state.v19??={};const s=state.v19;s.sort??='near';s.cmp??=[];s.scanRun??={};s.fired??={};return s};
  const L=(ru,en)=>T(ru,en);
  const ROUTE=(id,ru,en,section,desc)=>{if(!SCREEN_REGISTRY.some(s=>s[0]===id))SCREEN_REGISTRY.push([id,ru,en,section,desc])};
  const page=()=>app.querySelector('.screen:not(.screen-outgoing)');
  const tr=n=>{if(lang==='en'&&window.podhvat.i18n&&n)window.podhvat.i18n.translate(n)};
  const speed=()=>window.podhvat.v19?.speed??1;
  const hById=id=>helpers.find(h=>h.id===id);
  const hName=h=>lang==='ru'?h.name:h.en;
  const notes=()=>window.podhvat.v18?.state().notes||{};
  const fmtDue=iso=>window.podhvat.v18.fmtDue(iso);

  // иконки
  try{const sv='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    ICON_PATHS.compare=`<path ${sv} d="M5 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>`}catch{}

  /* ================= 1. Ответы помощника ================= */
  let typing=null; // {caseId,helperId}
  const timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn()},Math.max(0,ms*speed()));timers.add(t)};
  const push=(c,hid,m)=>{(c.chats[hid]??=[]).push({at:new Date().toISOString(),...m})};
  const viewing=(c,hid)=>screen==='chat'&&state.current===c.id&&helperId===hid;
  const redraw=(c,hid)=>{if(viewing(c,hid)){try{refreshMessages();showTyping()}catch{}}};
  function showTyping(){
    const box=document.getElementById('chat-messages');if(!box)return;box.querySelector('.typing')?.remove();
    if(typing&&screen==='chat'&&typing.caseId===state.current&&typing.helperId===helperId){
      const d=document.createElement('div');d.className='bubble typing';d.setAttribute('role','status');d.setAttribute('aria-label',L('Печатает','Typing'));d.innerHTML='<i></i><i></i><i></i>';box.appendChild(d);
      const sc=page()?.querySelector('.scroll-content');if(sc)sc.scrollTop=sc.scrollHeight}}
  const REP={
    price:[['Стоимость обсудим по ситуации. Для начала это бесплатно, расходы на корм обычно берут на себя.','The cost depends on the situation. The first step is free; food costs are usually covered separately.']],
    when:[['Могу сегодня. Напишите, когда вам удобно, и я подстроюсь.','I can today. Tell me what time suits you and I will adjust.']],
    where:[['Точный адрес откроется после взаимного согласия на контакты. Район я вижу в карточке случая.','The exact address opens after mutual consent to contacts. I can see the district in the case card.']],
    thanks:[['Рада помочь. Если что-то изменится, пишите.','Glad to help. Write if anything changes.']],
    def:[['Поняла вас. Уточню детали и отвечу чуть позже.','Got it. I will check the details and reply shortly.']]
  };
  const reply=(h,text)=>{const t=text.toLowerCase();
    const k=/сколько|цен|стоим|оплат|price|cost|pay/.test(t)?'price':/когда|во сколько|время|сегодня|when|time|today/.test(t)?'when':/адрес|где|куда|address|where/.test(t)?'where':/спасиб|thank/.test(t)?'thanks':'def';
    const r=REP[k][0];return h.kind==='organization'?[r[0].replace('Поняла','Поняли').replace('Рада','Рады').replace('Могу','Можем').replace('отвечу','ответим').replace('Уточню','Уточним').replace('я подстроюсь','мы подстроимся').replace('я вижу','мы видим'),r[1].replace('I can','We can').replace('I will','We will').replace('I can see','We can see').replace('adjust','adjust').replace('Glad','Glad')]:r};
  function sim(c,hid,text,offerTask){
    const h=hById(hid);if(!h)return;const cid=c.id;
    later(()=>{const cc=state.cases.find(x=>x.id===cid);if(!cc)return;
      push(cc,hid,{role:'system',text:hName(h)+' — прочитано',en:h.en+' — read',v19:'read'});persist();redraw(cc,hid)},1100);
    later(()=>{typing={caseId:cid,helperId:hid};if(viewing(c,hid))showTyping()},1900);
    const wait=2400+Math.min(2600,text.length*40);
    later(()=>{const cc=state.cases.find(x=>x.id===cid);typing=null;if(!cc)return;
      if(offerTask){const t=cc.tasks.find(x=>x.id===offerTask);
        if(t&&t.status==='offered'&&cc.lifecycle!=='closed'){t.status='assigned';try{addLog('Помощник подтвердил задачу','Helper accepted the task');award('agreement')}catch{}
          const ru=h.kind==='organization'?'Здравствуйте! Вижу запрос по случаю #'+cc.number+'. Мы готовы помочь, задачу подтверждаем.':'Здравствуйте! Вижу запрос по случаю #'+cc.number+'. Готова помочь, задачу подтверждаю.';
          const en=h.kind==='organization'?'Hello! I see the request for case #'+cc.number+'. We are ready to help and confirm the task.':'Hello! I see the request for case #'+cc.number+'. I am ready to help and confirm the task.';
          push(cc,hid,{role:'helper',text:ru,en,v19:'offer'});}
        else push(cc,hid,{role:'helper',...(()=>{const r=reply(h,text);return {text:r[0],en:r[1]}})()})}
      else push(cc,hid,{role:'helper',...(()=>{const r=reply(h,text);return {text:r[0],en:r[1]}})()});
      persist();
      if(viewing(cc,hid)){redraw(cc,hid);if(offerTask){try{render()}catch{}}}
      else toast(hName(h)+': '+L('новый ответ','new reply'))},wait);
  }
  const pmBefore=postMessage;
  postMessage=function(text){
    const c=current(),isChat=screen==='chat'&&helperId!=='claimant'&&hById(helperId)&&c.lifecycle!=='closed'&&String(text||'').trim();
    const r=pmBefore.apply(this,arguments);if(isChat)sim(c,helperId,String(text),null);return r};
  const rhBefore=requestHelper;
  requestHelper=function(){
    const c=current(),h=helper(),had=new Set(c.tasks.map(t=>t.id)),closed=c.lifecycle==='closed';
    const r=rhBefore.apply(this,arguments);
    if(!closed){const t=c.tasks.find(x=>!had.has(x.id)&&x.helperId===h.id&&x.status==='offered');if(t)sim(c,h.id,'',t.id)}
    return r};

  /* ================= 2. Напоминания ================= */
  const dueList=()=>Object.entries(notes()).filter(([,n])=>n.due&&!n.done).map(([k,n])=>({k,n,t:new Date(n.due).getTime()})).sort((a,b)=>a.t-b.t);
  const soon=()=>dueList().filter(x=>x.t<=Date.now()+864e5);
  const srcOf=(k,n)=>{if(n.text)return n.text;const [type,id]=k.split(':');if(type==='free')return L('Заметка','Note');const h=hById(id);return h?hName(h):L('Заметка','Note')};
  const remRow=x=>`<button class="notif rem ${x.t<Date.now()?'late':''}" data-v19="rem-open"><span class="pb-ico">${I('bell')}</span><span><b>${e(srcOf(x.k,x.n))}</b><small>${x.t<Date.now()?L('Просрочено','Overdue')+' · ':''}${fmtDue(x.n.due)}</small></span><span class="tail">${I('arrow')}</span></button>`;
  function checkDue(){
    const s=S();let any=false;
    for(const x of dueList()){if(x.t<=Date.now()&&s.fired[x.k]!==x.n.due){s.fired[x.k]=x.n.due;any=true;toast(L('Напоминание: ','Reminder: ')+srcOf(x.k,x.n))}}
    if(any){persist();if(screen==='home'||screen==='notifications'){try{render()}catch{}}}}
  setInterval(checkDue,20000);

  /* ================= 3. Сортировка и сравнение ================= */
  const respMin=id=>{const f=String(window.podhvat.v15?.data?.[id]?.facts?.[1]||'60');const n=parseInt(f.replace(/\D+/g,''),10)||60;return /ч/.test(f)?n*60:n};
  const info=h=>({km:parseFloat(String(h.distance).replace(',','.')),resp:respMin(h.id),rating:h.rating?parseFloat(String(h.rating).replace(',','.')):null,price:h.price});
  const SORTS=()=>[['near',L('Ближе','Nearest')],['fast',L('Быстрее отвечают','Faster replies')],['rating',L('Выше рейтинг','Top rated')],['free',L('Бесплатные','Free first')]];
  const cmpFn={near:(a,b)=>a.km-b.km,fast:(a,b)=>a.resp-b.resp,rating:(a,b)=>(b.rating??-1)-(a.rating??-1),free:(a,b)=>((a.price===0?0:1)-(b.price===0?0:1))||a.km-b.km};
  const idOfCard=c=>(c.querySelector('[data-action^="helper:"]')?.dataset.action||'').split(':')[1];
  let busy=false;
  function decorate(pg){
    if(!pg||busy)return;const cards=[...pg.querySelectorAll('.hcard')];if(!cards.length)return;busy=true;
    try{const s=S();
      // сортировка
      const first=cards[0],parent=first.parentElement;
      let row=pg.querySelector('.sort-row');
      if(!row){row=document.createElement('div');row.className='sort-row';row.setAttribute('role','group');row.setAttribute('aria-label',L('Сортировка','Sort'));parent.insertBefore(row,first);
        row.innerHTML=`<span class="sort-lab">${I('filter')}${L('Сначала','First')}</span>`+SORTS().map(([k,n])=>`<button type="button" data-v19="sort:${k}" aria-pressed="${s.sort===k}" class="${s.sort===k?'on':''}">${n}</button>`).join('');tr(row)}
      else row.querySelectorAll('[data-v19^="sort:"]').forEach(b=>{const on=b.dataset.v19==='sort:'+s.sort;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
      const fn=cmpFn[s.sort]||cmpFn.near,sorted=[...cards].sort((a,b)=>{const ha=hById(idOfCard(a)),hb=hById(idOfCard(b));return ha&&hb?fn(info(ha),info(hb)):0});
      if(sorted.some((c,i)=>c!==cards[i])){const anchor=cards[cards.length-1].nextSibling;sorted.forEach(c=>parent.insertBefore(c,anchor))}
      // кнопка «сравнить»
      cards.forEach(card=>{const id=idOfCard(card),foot=card.querySelector('.hc-foot');if(!id||!foot)return;
        const on=s.cmp.includes(id);let b=card.querySelector('.cmp-toggle');
        if(!b){b=document.createElement('button');b.type='button';b.className='icon-button cmp-toggle';b.dataset.v19='cmp:'+id;b.setAttribute('role','checkbox');foot.insertBefore(b,foot.querySelector('.hc-open'));b.innerHTML=I('compare')}
        b.classList.toggle('on',on);b.setAttribute('aria-checked',on);b.setAttribute('aria-label',(on?L('Убрать из сравнения: ','Remove from comparison: '):L('Добавить к сравнению: ','Add to comparison: '))+(card.querySelector('h2')?.textContent||''))});
      cmpBar(pg)}
    finally{busy=false}}
  function cmpBar(pg){
    const s=S();pg.querySelector('.cmp-bar')?.remove();if(!s.cmp.length)return;
    const bar=document.createElement('div');bar.className='cmp-bar';bar.innerHTML=`<span><b>${L('Сравнение','Comparison')}</b><small>${s.cmp.length} ${L('из 3','of 3')}</small></span><button type="button" class="button secondary" data-v19="cmp-clear">${L('Сбросить','Clear')}</button><button type="button" class="button" data-v19="cmp-go" ${s.cmp.length<2?'disabled':''}>${L('Сравнить','Compare')}</button>`;
    pg.appendChild(bar)}
  let obs=null;
  function watch(pg){obs?.disconnect();obs=null;const res=pg.querySelector('#directory-results');if(!res)return;
    obs=new MutationObserver(()=>{if(!busy)decorate(page())});obs.observe(res,{childList:true})}

  V.compare=()=>{
    const s=S(),c=current(),list=s.cmp.map(hById).filter(Boolean);
    if(list.length<2)return `<h1>${L('Сравнение','Comparison')}</h1><section class="card fav-empty"><h3>${L('Выберите двух или трёх помощников','Pick two or three helpers')}</h3><p>${L('Нажмите на значок сравнения в карточках списка.','Tap the comparison icon on the list cards.')}</p></section>${link(L('К списку помощников','Back to helpers'),'helpers','')}`;
    const I2=list.map(info),col=`grid-template-columns:84px repeat(${list.length},minmax(0,1fr))`;
    const best=(key,low)=>{const v=I2.map(x=>x[key]);const f=v.filter(x=>x!=null);if(f.length<2||new Set(f).size<2)return null;const b=low?Math.min(...f):Math.max(...f);return v.map(x=>x===b)};
    const fits=h=>restricted()&&h.type!=='specialist'?false:(h.groups.includes(c.group)||h.groups.includes('unknown')||!c.group);
    const row=(label,cells,bi=null)=>`<div class="cmp-row" style="${col}"><span class="cmp-l">${label}</span>${cells.map((v,i)=>`<span class="cmp-v ${bi&&bi[i]?'best':''}">${v}</span>`).join('')}</div>`;
    const price=h=>h.price===0?L('Бесплатно','Free'):h.price==null?L('По запросу','On request'):h.price+' ₽';
    const ach=h=>{const d=window.podhvat.v15?.data?.[h.id];return d?d.ach.length:0};
    return `<h1>${L('Сравнение помощников','Compare helpers')}</h1><p class="muted">${L('Лучшее значение отмечено точкой. Данные из карточек, без оценок от Подхвата.','The best value is marked with a dot. Figures come from the cards, with no rating added by Podhvat.')}</p>
    <section class="card cmp-card">
      <div class="cmp-row cmp-head" style="${col}"><span></span>${list.map(h=>`<span class="cmp-v"><img class="h-avatar" src="${ART.avatar(h.id)}" alt="" width="44" height="44"><b>${e(hName(h))}</b><small>${h.kind==='organization'?L('Организация','Organization'):L('Волонтёр','Volunteer')}</small></span>`).join('')}</div>
      ${row(L('Помощь','Help'),list.map(h=>e(lang==='ru'?h.tag:h.tagEN)))}
      ${row(L('Расстояние','Distance'),I2.map(x=>x.km.toString().replace('.',',')+' '+L('км','km')),best('km',true))}
      ${row(L('Ответ','Reply'),I2.map(x=>x.resp>=60?Math.round(x.resp/60)+' '+L('ч','h'):x.resp+' '+L('мин','min')),best('resp',true))}
      ${row(L('Рейтинг','Rating'),I2.map(x=>x.rating!=null?String(x.rating).replace('.',','):'—'),best('rating',false))}
      ${row(L('Цена','Price'),list.map(price))}
      ${row(L('Достижения','Achievements'),list.map(ach),(()=>{const v=list.map(ach),m=Math.max(...v);return new Set(v).size>1?v.map(x=>x===m):null})())}
      ${row(L('Животные','Animals'),list.map(h=>e(h.groups.map(groupName).join(', '))))}
      ${row(L('Для вашего случая','For your case'),list.map(h=>fits(h)?L('Подходит','Fits'):L('Нужен специалист','Needs a specialist')))}
      <div class="cmp-row cmp-act" style="${col}"><span></span>${list.map(h=>`<span class="cmp-v"><button class="button secondary" data-action="helper:${h.id}">${L('Профиль','Profile')}</button></span>`).join('')}</div>
    </section>
    <button class="button ghost" data-v19="cmp-clear-back">${L('Сбросить сравнение','Clear comparison')}</button>`};
  ROUTE('compare','Сравнение помощников','Compare helpers','Связь','Две–три карточки рядом: расстояние, ответ, рейтинг, цена, достижения, подходят ли для случая.');
  const tabBefore=tabFor;tabFor=id=>id==='compare'?tabBefore('helpers'):tabBefore(id);

  /* ================= 4. Сверка скана со случаями рядом ================= */
  const flip=(sig,bits,seed)=>{const a=sig.split('');let x=seed|0||7;const used=new Set();let n=0;
    while(n<bits&&used.size<sig.length*4){x=(Math.imul(x,1103515245)+12345)>>>0;const bit=x%(sig.length*4);if(used.has(bit))continue;used.add(bit);const i=bit>>2,v=parseInt(a[i],16)^(1<<(bit&3));a[i]=v.toString(16);n++}return a.join('')};
  const hashStr=s=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const TARGET=[.93,.8,.6,.55,.5];
  function scanNearby(rec,species){
    const v=window.podhvat.v17;if(!rec||!v||!['dog','cat'].includes(species))return [];
    const good=rec.frames.find(f=>f.q?.ok)||rec.frames[0];if(!good)return [];
    const pool=v.nb().filter(n=>n.species===species);
    return pool.map((n,i)=>{
      const t=TARGET[Math.min(i,TARGET.length-1)],bits=Math.round((1-t)*good.sig.length*4);
      const r={frames:[{sig:flip(good.sig,bits,hashStr(n.id+good.sig.slice(0,8))),q:{ok:true}}]};
      const sim=v.similarity(rec,r);return {n,sim,b:v.bucket(sim)}}).sort((a,b)=>b.sim-a.sim)};
  const km=n=>((n.x+n.y)/30+.4).toFixed(1).replace('.',',');
  function nearCard(key,rec,species){
    const s=S(),ran=s.scanRun[key];
    const head=`<div class="sc-head"><span class="ve-ico" aria-hidden="true">${I('scan')}</span><div><h3>${L('Сверить со случаями рядом','Check against nearby cases')}</h3><small>${species==='dog'?L('Сравним скан носа с карточками рядом','We will compare the nose scan with nearby cards'):L('Сравним скан морды с карточками рядом','We will compare the face scan with nearby cards')}</small></div></div>`;
    if(!ran)return `<section class="card scan-card scan-near" data-near="${key}">${head}<button class="button secondary" data-v19="scan-near:${key}">${L('Сверить','Check')}</button></section>`;
    const res=scanNearby(rec,species);
    return `<section class="card scan-card scan-near" data-near="${key}">${head}${res.length?`<div class="near-list">${res.map(r=>`<button class="near-row ${r.b[0]}" data-v19="near-open:${r.n.id}"><img src="${(r.n.media.find(m=>m.k==='photo')||r.n.media[0]).src||(r.n.media[0].poster)}" alt="" width="56" height="56"><span><b>${e(r.n.title)}</b><small>${e(r.n.place)} · ${km(r.n)} ${L('км','km')}</small><i class="sim-pill ${r.b[0]}">${r.b[1]}</i></span><span class="tail">${I('arrow')}</span></button>`).join('')}</div><p class="caption">${L('Сверка идёт по простым признакам изображений. Это повод проверить карточку, а не доказательство. Контакты открываются только по согласию обеих сторон.','The comparison uses simple image features. It is a reason to check a card, not proof. Contacts open only with both sides’ consent.')}</p><button class="text-button" data-v19="scan-near-reset:${key}">${L('Сверить заново','Check again')}</button>`:`<p>${L('Рядом нет случаев этого вида.','No nearby cases of this kind.')}</p>`}</section>`}

  /* ================= события ================= */
  document.addEventListener('click',ev=>{
    const b=ev.target.closest('[data-v19]');if(!b)return;
    const [a,...r]=b.dataset.v19.split(':'),p=r.join(':'),s=S();ev.preventDefault();ev.stopPropagation();
    switch(a){
      case'sort':s.sort=p;persist();decorate(page());break;
      case'cmp':{const i=s.cmp.indexOf(p);if(i>=0)s.cmp.splice(i,1);else if(s.cmp.length>=3){toast(L('Можно сравнить до трёх помощников.','You can compare up to three helpers.'));break}else s.cmp.push(p);persist();decorate(page());break}
      case'cmp-clear':s.cmp=[];persist();decorate(page());break;
      case'cmp-go':if(s.cmp.length>=2)go('compare');break;
      case'cmp-clear-back':s.cmp=[];persist();go('helpers');break;
      case'rem-open':savedFilter='notes';go('favorites');break;
      case'scan-near':s.scanRun[p]=Date.now();persist();render();break;
      case'scan-near-reset':delete s.scanRun[p];persist();render();break;
      case'near-open':window.podhvat.v17.open(p);break;
    }},true);

  /* ================= страницы ================= */
  function tidy(){
    const pg=page();if(!pg||pg.dataset.v19done)return;pg.dataset.v19done='1';
    if(['helpers','volunteers','organizations'].includes(screen)){decorate(pg);watch(pg)}
    if(screen==='home'&&soon().length){
      const list=soon().slice(0,2);
      const html=`<section class="card rem-card"><h3>${I('bell')}${L('Напоминания','Reminders')}</h3><div class="notif-list">${list.map(remRow).join('')}</div></section>`;
      const anchor=pg.querySelector('.home-scout-centred');if(anchor)anchor.insertAdjacentHTML('afterend',html);else pg.querySelector('.scroll-content')?.insertAdjacentHTML('afterbegin',html);tr(pg.querySelector('.rem-card'))}
    if(screen==='notifications'&&dueList().length){
      const html=`<h2 class="v14-h2">${L('Мои напоминания','My reminders')}</h2><div class="notif-list">${dueList().map(remRow).join('')}</div>`;
      pg.querySelector('.v14-h2')?.insertAdjacentHTML('beforebegin',html);tr(pg)}
    if(screen==='chat'){
      showTyping();
      const c=current(),done=(c.chats[helperId]||[]).some(m=>m.v19==='offer');
      if(done&&!pg.querySelector('.agree-card')){
        const t=c.tasks.find(x=>x.helperId===helperId);
        pg.querySelector('#chat-messages')?.insertAdjacentHTML('afterend',`<div class="agree-card"><span>${I('check')}</span><div><b>${L('Договорённость зафиксирована','Agreement recorded')}</b><small>${e(lang==='ru'?(t?.title||''):(t?.titleEN||t?.title||''))}</small></div><button class="button secondary" data-go="tasks">${L('Открыть задачи','Open tasks')}</button></div>`)}}
    if(screen==='matches'&&current().scan&&['dog','cat'].includes(current().species)){
      const card=pg.querySelector('.scan-card');
      const html=nearCard('case',current().scan,current().species);
      if(card)card.insertAdjacentHTML('afterend',html);tr(pg.querySelector('.scan-near'))}
    if(screen==='pet'){const v=window.podhvat.v17,rec=v?.state().petScan;
      if(rec){const sp=v.state().petKind==='nose'?'dog':'cat';
        pg.querySelector('.scan-card')?.insertAdjacentHTML('afterend',nearCard('pet',rec,sp));tr(pg.querySelector('.scan-near'))}}
  }
  const renderBefore=render;
  render=function(...a){const r=renderBefore.apply(this,a);tidy();return r};
  const refBefore=refreshMessages;
  refreshMessages=function(...a){const r=refBefore.apply(this,a);showTyping();return r};
  Object.assign(window.podhvat,{v19:{state:S,speed:1,scanNearby,info,checkDue}});
  render();
})();

/* ===== src/js/25-scout3d.js ===== */
/* v20 · 3D-Скаут на главной.
   Собственный компактный WebGL-рендер GLB (скелет, текстуры, веки, блики) — без сторонних библиотек.
   Взгляд всегда направлен на пользователя (в камеру), а не за курсором. Реакции: касание, «Попросить помощи»,
   эмоция Скаута (data-emotion), срочный случай. PNG остаётся запасным вариантом (нет WebGL / ошибка загрузки). */
(()=>{
  'use strict';
  const NS=window.podhvat=window.podhvat||{};
  const FIT={dist:3.75,cy:.475,fov:27};            // камера: расстояние, высота центра, поле зрения
  const SRC='assets/scout-dog.glb.js';
  /* В автоматических прогонах (Playwright/webdriver) 3D выключен, чтобы не тормозить регрессию программным WebGL; ?s3d=1 включает. */
  const AUTOMATED=!!navigator.webdriver&&!/[?&]s3d=1/.test(location.search);
  const reduced=()=>{try{return !!(window.podhvat&&podhvat.state&&podhvat.state.prefs&&podhvat.state.prefs.reduceMotion)||matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};

  /* ---------- математика ---------- */
  const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
  const qconj=q=>[-q[0],-q[1],-q[2],q[3]];
  const qnorm=q=>{const l=Math.hypot(q[0],q[1],q[2],q[3])||1;return [q[0]/l,q[1]/l,q[2]/l,q[3]/l]};
  const qaxis=(x,y,z,a)=>{const s=Math.sin(a/2);return [x*s,y*s,z*s,Math.cos(a/2)]};
  const QI=[0,0,0,1];
  const qslerp=(a,b,t)=>{let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];let bb=b;if(d<0){d=-d;bb=[-b[0],-b[1],-b[2],-b[3]]}
    if(d>.9995)return qnorm([a[0]+(bb[0]-a[0])*t,a[1]+(bb[1]-a[1])*t,a[2]+(bb[2]-a[2])*t,a[3]+(bb[3]-a[3])*t]);
    const th=Math.acos(d),s=Math.sin(th),w1=Math.sin((1-t)*th)/s,w2=Math.sin(t*th)/s;
    return [a[0]*w1+bb[0]*w2,a[1]*w1+bb[1]*w2,a[2]*w1+bb[2]*w2,a[3]*w1+bb[3]*w2]};
  const qrot=(q,v)=>{const u=[q[0],q[1],q[2]],s=q[3];const c=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const t=c(u,v).map(x=>2*x),w=c(u,t);return [v[0]+s*t[0]+w[0],v[1]+s*t[1]+w[1],v[2]+s*t[2]+w[2]]};
  const norm3=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]};
  const dot3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const fromTo=(a,b)=>{const d=dot3(a,b);if(d<-.9999){return [0,1,0,0]}const c=cross3(a,b);return qnorm([c[0],c[1],c[2],1+d])};
  const qangle=q=>2*Math.acos(Math.min(1,Math.abs(q[3])));
  function trs(t,q,s){const [x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
    return new Float32Array([(1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,(xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,(xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,t[0],t[1],t[2],1])}
  function mmul(a,b,o){o=o||new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
  const persp=(fov,asp,n,f)=>{const t=1/Math.tan(fov*Math.PI/360);return new Float32Array([t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])};
  const lookAt=(e,c)=>{const z=norm3([e[0]-c[0],e[1]-c[1],e[2]-c[2]]),x=norm3(cross3([0,1,0],z)),y=cross3(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot3(x,e),-dot3(y,e),-dot3(z,e),1])};
  const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);

  /* ---------- GLB ---------- */
  function parseGLB(buf){
    const dv=new DataView(buf);if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not glb');
    const jl=dv.getUint32(12,true);const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));
    const bo=20+jl+8;return {json,bin:new Uint8Array(buf,bo,dv.getUint32(20+jl,true))};
  }
  const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
  const NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  function readAcc(g,i){
    const j=g.json,a=j.accessors[i],bv=j.bufferViews[a.bufferView],n=NC[a.type],T=CT[a.componentType],bs=T.BYTES_PER_ELEMENT;
    const off=g.bin.byteOffset+(bv.byteOffset||0)+(a.byteOffset||0),stride=bv.byteStride||n*bs,out=new Float32Array(a.count*n);
    const dv=new DataView(g.bin.buffer);const norm=a.normalized;const mx={5120:127,5121:255,5122:32767,5123:65535}[a.componentType];
    const get={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
    for(let k=0;k<a.count;k++)for(let c=0;c<n;c++){let v=dv[get](off+k*stride+c*bs,true);if(norm)v=Math.max(v/mx,-1);out[k*n+c]=v}
    return out;
  }

  /* ---------- шейдеры ---------- */
  const VS=`attribute vec3 aPos;attribute vec3 aNor;attribute vec2 aUv;attribute vec4 aJ;attribute vec4 aW;attribute vec3 aCol;
uniform mat4 uProj,uView,uModel;uniform mat4 uJ[12];uniform float uSkin;
varying vec3 vN,vP,vC;varying vec2 vUv;
void main(){mat4 m=uModel;
if(uSkin>.5){m=aW.x*uJ[int(aJ.x+.5)]+aW.y*uJ[int(aJ.y+.5)]+aW.z*uJ[int(aJ.z+.5)]+aW.w*uJ[int(aJ.w+.5)];}
vec4 wp=m*vec4(aPos,1.);vP=wp.xyz;vN=mat3(m)*aNor;vUv=aUv;vC=aCol;gl_Position=uProj*uView*wp;}`;
  const FS=`precision mediump float;varying vec3 vN,vP,vC;varying vec2 vUv;uniform sampler2D uTex;uniform float uMode;uniform vec3 uCam;uniform float uDark;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
vec3 base=uMode<1.5?texture2D(uTex,vUv).rgb:(uMode<2.5?vC:vec3(1.));
base=pow(base,vec3(2.2));
vec3 L=normalize(vec3(-.5,.65,.85));vec3 L2=normalize(vec3(.8,.1,.5));vec3 V=normalize(uCam-vP);
float nl=dot(n,L),d=max(nl,0.),wr=nl*.5+.5;
vec3 amb=mix(vec3(.34,.35,.38),vec3(.68,.69,.7),n.y*.5+.5)*(1.-.25*uDark);
vec3 col=base*(amb+vec3(1.,.97,.92)*(.28*wr*wr+.62*d)+vec3(.55,.62,.75)*max(dot(n,L2),0.)*.22);
float fr=pow(1.-max(dot(n,V),0.),3.);col+=fr*vec3(.55,.65,.8)*.14;
vec3 H=normalize(L+V);float sp=pow(max(dot(n,H),0.),uMode>.5&&uMode<1.5?110.:16.);col+=sp*(uMode>.5&&uMode<1.5?.9:.035);
if(uMode>2.5)col=vec3(1.);
col=pow(col,vec3(1./2.2));gl_FragColor=vec4(col,1.);}`;

  /* ---------- состояние ---------- */
  const M={ready:false,failed:false,canvas:null,gl:null,t:0,last:0,raf:0,wrap:null,mood:'calm',reacts:[],P:{},T:{},sacc:[0,0],saccT:0,nextIdle:5,visible:true,frames:0,gaze:1,reducedStatic:false,fpsCap:30,ema:0};
  const PK=['yaw','pitch','roll','earL','earR','earBackL','earBackR','brow','worry','squint','wide','bounce','sniff'];
  PK.forEach(k=>{M.P[k]=0;M.T[k]=0});

  function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
  function loadScript(src){return new Promise((res,rej)=>{if(window.__SCOUT_DOG_B64)return res();const s=document.createElement('script');s.src=src;s.onload=()=>res();s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)})}
  const isPow2=n=>(n&(n-1))===0;

  async function build(){
    const canvas=document.createElement('canvas');canvas.className='s3d';canvas.setAttribute('aria-hidden','true');
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'});
    if(!gl)throw new Error('no webgl');
    await loadScript(SRC);
    const bytes=Uint8Array.from(atob(window.__SCOUT_DOG_B64),c=>c.charCodeAt(0));window.__SCOUT_DOG_B64=null;
    const g=parseGLB(bytes.buffer),j=g.json;
    const prog=gl.createProgram();gl.attachShader(prog,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(prog,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const loc={};['uProj','uView','uModel','uJ','uSkin','uTex','uMode','uCam','uDark'].forEach(n=>loc[n]=gl.getUniformLocation(prog,n));
    const att={};['aPos','aNor','aUv','aJ','aW','aCol'].forEach(n=>att[n]=gl.getAttribLocation(prog,n));
    /* текстуры */
    const tex=[];
    for(let i=0;i<(j.textures||[]).length;i++){
      const img=j.images[j.textures[i].source],bv=j.bufferViews[img.bufferView];
      const blob=new Blob([g.bin.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength)],{type:img.mimeType});
      const bmp=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'});
      const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bmp);
      const pot=isPow2(bmp.width)&&isPow2(bmp.height);
      if(pot){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);const ex=gl.getExtension('EXT_texture_filter_anisotropic');if(ex)gl.texParameterf(gl.TEXTURE_2D,ex.TEXTURE_MAX_ANISOTROPY_EXT,4)}
      else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      const clamp=pot&&!(j.samplers&&j.samplers[j.textures[i].sampler]&&j.samplers[j.textures[i].sampler].wrapS===33071)?gl.REPEAT:gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,clamp);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,clamp);
      tex.push(t);bmp.close&&bmp.close();
    }
    /* узлы */
    const nodes=j.nodes.map((n,i)=>({i,name:n.name,t:n.translation||[0,0,0],r:n.rotation||[0,0,0,1],s:n.scale||[1,1,1],ch:n.children||[],mesh:n.mesh,skin:n.skin,p:-1,lt:null,lr:null,ls:null,wm:new Float32Array(16),wr:QI,wp:[0,0,0]}));
    nodes.forEach(n=>n.ch.forEach(c=>nodes[c].p=n.i));
    const order=[];(function walk(i){order.push(i);nodes[i].ch.forEach(walk)})(j.scenes[j.scene||0].nodes[0]);
    const byName={};nodes.forEach(n=>byName[n.name]=n);
    /* меши */
    const mk=(data,size,target)=>{const b=gl.createBuffer();gl.bindBuffer(target||gl.ARRAY_BUFFER,b);gl.bufferData(target||gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b};
    const meshes=j.meshes.map(me=>me.primitives.map(p=>{
      const A=p.attributes,m=j.materials[p.material]||{};
      const d={pos:mk(readAcc(g,A.POSITION)),nor:A.NORMAL!=null?mk(readAcc(g,A.NORMAL)):null,uv:A.TEXCOORD_0!=null?mk(readAcc(g,A.TEXCOORD_0)):null,
        jn:A.JOINTS_0!=null?mk(readAcc(g,A.JOINTS_0)):null,w:A.WEIGHTS_0!=null?mk(readAcc(g,A.WEIGHTS_0)):null};
      if(A.COLOR_0!=null){const raw=readAcc(g,A.COLOR_0),n=j.accessors[A.COLOR_0].type==='VEC4'?4:3,c=new Float32Array(raw.length/n*3);for(let k=0;k<raw.length/n;k++){c[k*3]=raw[k*n];c[k*3+1]=raw[k*n+1];c[k*3+2]=raw[k*n+2]}d.col=mk(c)}
      const ix=readAcc(g,p.indices),i16=new Uint16Array(ix.length);for(let k=0;k<ix.length;k++)i16[k]=ix[k];
      d.idx=mk(i16,1,gl.ELEMENT_ARRAY_BUFFER);d.n=ix.length;
      const nm=(m.name||'').toLowerCase();d.mode=nm==='eyeball'?1:nm==='eyelid'?2:nm==='glint'?3:0;
      const bt=m.pbrMetallicRoughness&&m.pbrMetallicRoughness.baseColorTexture;d.tex=bt?tex[bt.index]:null;
      return d}));
    const skin=j.skins[0],ibm=readAcc(g,skin.inverseBindMatrices);
    /* анимация */
    const an=j.animations[0],chans=an.channels.map(c=>{const s=an.samplers[c.sampler];return {node:c.target.node,path:c.target.path,t:readAcc(g,s.input),v:readAcc(g,s.output)}});
    const dur=chans.reduce((m,c)=>Math.max(m,c.t[c.t.length-1]),0);
    Object.assign(M,{canvas,gl,prog,loc,att,nodes,order,byName,meshes,skin,ibm,chans,dur,ready:true});
    M.jm=new Float32Array(12*16);
  }

  /* ---------- сэмплирование и поза ---------- */
  function sample(c,t){const T=c.t,n=T.length;let k=0;if(t>=T[n-1])k=n-2;else{let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T[m]<=t)lo=m;else hi=m}k=lo}
    const u=Math.min(1,Math.max(0,(t-T[k])/((T[k+1]-T[k])||1))),w=c.path==='rotation'?4:3,a=c.v.subarray(k*w,k*w+w),b=c.v.subarray((k+1)*w,(k+1)*w+w);
    if(c.path==='rotation')return qslerp(Array.from(a),Array.from(b),u);return Array.from(a).map((x,i)=>x+(b[i]-x)*u)}
  function worlds(){const N=M.nodes;for(const i of M.order){const n=N[i],l=trs(n.lt,n.lr,n.ls);
    if(n.p<0){n.wm.set(l);n.wr=n.lr}else{mmul(N[n.p].wm,l,n.wm);n.wr=qmul(N[n.p].wr,n.lr)}n.wp=[n.wm[12],n.wm[13],n.wm[14]]}}

  function pose(t){
    const N=M.nodes,P=M.P,B=M.byName;
    N.forEach(n=>{n.lt=n.t.slice();n.lr=n.r.slice();n.ls=n.s.slice()});
    for(const c of M.chans){const n=N[c.node];if(M.noAnim&&/^(Head|Eye|Hi)/.test(n.name))continue;const v=sample(c,t%M.dur);if(c.path==='rotation')n.lr=v;else if(c.path==='translation')n.lt=v;else n.ls=v}
    const R=(name,q)=>{const n=B[name];if(n)n.lr=qmul(n.lr,q)};
    const X=(a)=>qaxis(1,0,0,a),Y=a=>qaxis(0,1,0,a),Z=a=>qaxis(0,0,1,a);
    /* голова: наклоны реакций */
    R('Head',qmul(qmul(Y(P.yaw),X(P.pitch)),Z(P.roll)));
    B.Head.lt[1]+=P.bounce;
    /* уши: подъём наружу (по Z) и отведение назад (по X) */
    R('EarL1',qmul(Z(-P.earL*.34),X(P.earBackL*.42)));R('EarR1',qmul(Z(P.earR*.34),X(P.earBackR*.42)));
    R('EarL2',Z(-P.earL*.12));R('EarR2',Z(P.earR*.12));
    /* брови: подъём и «домик» */
    const bu=P.brow*.022;B.BrowL.lt[1]+=bu;B.BrowR.lt[1]+=bu;R('BrowL',Z(P.worry*.34));R('BrowR',Z(-P.worry*.34));
    /* веки: прищур (+) / широко (−) */
    const dl=P.squint*.5-P.wide*.3;R('LidUpL',X(dl));R('LidUpR',X(dl));R('LidLowL',X(-dl*.7));R('LidLowR',X(-dl*.7));
    /* нос: принюхивание */
    if(P.sniff>.01){R('Muzzle',X(Math.sin(t*22)*.05*P.sniff));B.Muzzle.lt[1]+=Math.abs(Math.sin(t*22))*.004*P.sniff}
    worlds();
    /* ВЗГЛЯД НА ПОЛЬЗОВАТЕЛЯ: глаза поворачиваются к камере, даже когда голова покачивается */
    const IRIS={EyeL:norm3([.059,.031,.998]),EyeR:norm3([-.018,.058,.998])}; /* ось радужки в системе кости (измерена по мешу) */
    const cam=[0,FIT.cy,FIT.dist],G=M.gaze*(1-Math.min(1,P.wide*0));
    for(const [eye,hi] of [['EyeL','HiL'],['EyeR','HiR']]){
      const e=B[eye],p=N[e.p],Rw=e.wr,f=qrot(Rw,IRIS[eye]);
      let fd=norm3([cam[0]-e.wp[0]+M.sacc[0]*FIT.dist,cam[1]-e.wp[1]+M.sacc[1]*FIT.dist,cam[2]-e.wp[2]]);
      let qc=fromTo(f,fd);const a=qangle(qc),mx=.52;if(a>mx)qc=qslerp(QI,qc,mx/a);qc=qslerp(QI,qc,G);
      const nl=qmul(qconj(p.wr),qmul(qc,Rw));
      const delta=qmul(qconj(e.lr),nl);e.lr=nl;
      const h=B[hi];if(h)h.lr=qmul(h.lr,qslerp(QI,delta,.55));
    }
    worlds();
  }

  /* ---------- реакции и настроения ---------- */
  const MOODS={
    calm:{},
    listening:{roll:.07,earL:.25,earR:.25,brow:.25},
    happy:{earL:.45,earR:.45,squint:.38,brow:.2},
    support:{earBackL:.8,earBackR:.8,worry:.9,brow:.15,pitch:.07,roll:-.05}
  };
  const REACT={
    happy:{d:1.7,f:(p,e,s)=>({roll:.2*s*e,pitch:-.05*e,earL:.9*e,earR:.9*e,brow:.8*e,squint:.55*e,bounce:.02*Math.abs(Math.sin(p*Math.PI*3))*e})},
    curious:{d:1.9,f:(p,e,s)=>({roll:.27*s*e,yaw:.09*s*e,earL:(s>0?.8:.2)*e,earR:(s>0?.2:.8)*e,brow:.6*e,worry:.2*e,sniff:Math.max(0,Math.sin(p*Math.PI))*.8})},
    alert:{d:1.1,f:(p,e)=>({pitch:-.09*e,earL:1*e,earR:1*e,brow:1*e,wide:.7*e,bounce:.012*Math.sin(p*Math.PI)})},
    nod:{d:1.0,f:(p,e)=>({pitch:.1*Math.sin(p*Math.PI*2)*Math.min(1,e*2),earL:.3*e,earR:.3*e})}
  };
  function react(kind){if(reduced()||!REACT[kind])return false;M.reacts.push({k:kind,t0:M.t,s:Math.random()<.5?-1:1});if(M.reacts.length>3)M.reacts.shift();wake();return true}
  function targets(){
    const T={};PK.forEach(k=>T[k]=0);const mood=MOODS[M.mood]||{};for(const k in mood)T[k]+=mood[k];
    M.reacts=M.reacts.filter(r=>M.t-r.t0<REACT[r.k].d);
    for(const r of M.reacts){const R=REACT[r.k],p=(M.t-r.t0)/R.d,e=Math.pow(Math.sin(Math.PI*Math.min(1,p)),.7);const o=R.f(p,e,r.s);for(const k in o)T[k]+=o[k]}
    M.T=T;
  }
  function step(dt){
    targets();const a=1-Math.exp(-dt*9);
    for(const k of PK)M.P[k]+=(M.T[k]-M.P[k])*a;
    /* живой взгляд: мелкие саккады вокруг камеры */
    M.saccT-=dt;if(M.saccT<=0){M.saccT=.5+Math.random()*1.8;M.sacc=[(Math.random()-.5)*.045,(Math.random()-.5)*.03]}
    /* периодическое внимание: наклон головы / ухо */
    M.nextIdle-=dt;if(M.nextIdle<=0&&!reduced()){M.nextIdle=6+Math.random()*6;react(Math.random()<.65?'curious':'nod')}
  }

  /* ---------- отрисовка ---------- */
  function size(){const c=M.canvas,w=c.clientWidth||188,dpr=Math.min(window.devicePixelRatio||1,2.5),px=Math.round(w*dpr);if(c.width!==px||c.height!==px){c.width=px;c.height=px}}
  function draw(){
    const gl=M.gl,c=M.canvas;size();gl.viewport(0,0,c.width,c.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    const L=M.loc,A=M.att,N=M.nodes;
    gl.uniformMatrix4fv(L.uProj,false,persp(FIT.dist>0?FIT.fov:30,1,.1,20));
    gl.uniformMatrix4fv(L.uView,false,lookAt([0,FIT.cy,FIT.dist],[0,FIT.cy,0]));
    gl.uniform3f(L.uCam,0,FIT.cy,FIT.dist);gl.uniform1f(L.uDark,document.body.classList.contains('dark')?1:0);gl.uniform1i(L.uTex,0);
    /* матрицы суставов */
    const sk=M.skin,jm=M.jm,tmp=new Float32Array(16);
    sk.joints.forEach((ni,k)=>{mmul(N[ni].wm,M.ibm.subarray(k*16,k*16+16),tmp);jm.set(tmp,k*16)});
    gl.uniformMatrix4fv(L.uJ,false,jm);
    const bind=(buf,loc,size)=>{if(buf&&loc>=0){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)}};
    const off=loc=>{if(loc>=0)gl.disableVertexAttribArray(loc)};
    const pass=glint=>{for(const n of N){if(n.mesh==null)continue;
      const skinned=n.skin!=null;
      for(const d of M.meshes[n.mesh]){if((d.mode===3)!==glint)continue;
        gl.uniform1f(L.uSkin,skinned?1:0);gl.uniformMatrix4fv(L.uModel,false,skinned?new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]):n.wm);
        gl.uniform1f(L.uMode,d.mode);
        if(d.tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,d.tex)}
        bind(d.pos,A.aPos,3);if(d.nor)bind(d.nor,A.aNor,3);else{off(A.aNor);gl.vertexAttrib3f(A.aNor,0,0,1)}
        if(d.uv)bind(d.uv,A.aUv,2);else{off(A.aUv);gl.vertexAttrib2f(A.aUv,0,0)}
        if(d.jn){bind(d.jn,A.aJ,4);bind(d.w,A.aW,4)}else{off(A.aJ);off(A.aW);gl.vertexAttrib4f(A.aJ,0,0,0,0);gl.vertexAttrib4f(A.aW,1,0,0,0)}
        if(d.col)bind(d.col,A.aCol,3);else{off(A.aCol);gl.vertexAttrib3f(A.aCol,1,1,1)}
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,d.idx);gl.drawElements(gl.TRIANGLES,d.n,gl.UNSIGNED_SHORT,0)}}};
    pass(false);pass(true);M.frames++;
  }
  function frame(now){
    M.raf=0;if(M.freeze)return;if(!M.ready||!M.wrap||!M.canvas.isConnected||document.hidden||!M.visible)return;
    const t=now/1000;
    /* 30 кадров в секунду достаточно для мультяшной анимации и вдвое экономит батарею */
    if(M.last&&t-M.last<1/M.fpsCap-.003){if(!M.reducedStatic)M.raf=requestAnimationFrame(frame);return}
    const dt=Math.min(.06,M.last?t-M.last:.016);M.last=t;M.t+=dt;
    step(dt);pose(M.t);draw();
    /* слабое устройство: снижаем частоту, затем возвращаем статичную картинку */
    M.ema=M.ema?M.ema*.92+dt*.08:dt;
    if(M.frames>45&&M.frames%30===0){
      if(M.ema>.14){degrade(2)}else if(M.ema>.075&&M.fpsCap>15){M.fpsCap=15}
    }
    if(!M.reducedStatic)M.raf=requestAnimationFrame(frame);
  }
  function degrade(level){
    if(level>=2){M.failed=true;if(M.wrap)M.wrap.classList.remove('has3d');if(M.canvas&&M.canvas.parentNode)M.canvas.remove();M.raf=0;console.warn('[scout3d] устройство слабое — оставляю статичный PNG')}
  }
  function wake(){if(M.ready&&!M.raf&&M.canvas&&M.canvas.isConnected&&!document.hidden){M.last=0;M.raf=requestAnimationFrame(frame)}}

  /* ---------- встраивание на главную ---------- */
  let io=null;
  function emotionOf(w){const e=w.getAttribute('data-emotion')||'calm';return MOODS[e]?e:'calm'}
  function mount(){
    const app=document.getElementById('app');if(!app)return;
    const all=app.querySelectorAll('.home-scout-art');const w=all[all.length-1];
    if(!w){if(M.wrap){M.wrap.classList.remove('has3d');M.wrap=null}return}
    if(M.wrap===w&&M.canvas&&M.canvas.parentNode===w)return;
    if(M.wrap&&M.wrap!==w)M.wrap.classList.remove('has3d');
    M.wrap=w;
    if(M.failed||AUTOMATED)return;
    if(!M.ready){if(!M.loading){M.loading=true;build().then(()=>{M.loading=false;mount();if(!M.firstGreeted){M.firstGreeted=true;setTimeout(()=>react('happy'),500)}}).catch(e=>{M.failed=true;M.loading=false;console.warn('[scout3d] fallback to PNG:',e.message)})}return}
    attach(w);
  }
  function attach(w){
    const c=M.canvas;if(c.parentNode!==w)w.appendChild(c);
    w.classList.add('has3d');M.mood=emotionOf(w);
    M.reducedStatic=reduced();
    if(io)io.disconnect();
    if('IntersectionObserver' in window){io=new IntersectionObserver(es=>{M.visible=es[es.length-1].isIntersecting;if(M.visible)wake()},{threshold:.05});io.observe(w)}
    wake();
  }


  /* Сердечки при касании: цвет дизайн-системы (лайм + чернильный контур), поднимаются и растворяются */
  const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.8a4.7 4.7 0 0 1 8.5 2.4C20.5 15 12 20.5 12 20.5Z"/></svg>';
  function hearts(ev,n){
    if(reduced()||!M.wrap)return 0;
    let layer=M.wrap.querySelector(':scope>.s3d-hearts');if(!layer){layer=document.createElement('div');layer.className='s3d-hearts';layer.setAttribute('aria-hidden','true');M.wrap.appendChild(layer)}
    const r=M.wrap.getBoundingClientRect();n=n||6+Math.floor(Math.random()*3);
    let ox=r.width/2,oy=r.height*.32;
    if(ev&&ev.clientX!=null&&r.width){ox=Math.min(r.width*.85,Math.max(r.width*.15,ev.clientX-r.left));oy=Math.min(r.height*.7,Math.max(r.height*.1,ev.clientY-r.top))}
    const live=layer.children.length;let made=0;
    for(let i=0;i<n&&live+made<28;i++){
      const h=document.createElement('i');h.className='s3d-heart'+(i%3===1?' deep':'');h.innerHTML=HEART;
      const sz=14+Math.random()*13;
      h.style.cssText=`left:${(ox+(Math.random()-.5)*34).toFixed(1)}px;top:${(oy+(Math.random()-.5)*14).toFixed(1)}px;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;--dx:${((Math.random()-.5)*64).toFixed(1)}px;--up:${(90+Math.random()*60).toFixed(0)}px;--r:${((Math.random()-.5)*50).toFixed(0)}deg;animation-delay:${(i*70+Math.random()*60).toFixed(0)}ms;animation-duration:${(1.1+Math.random()*.6).toFixed(2)}s`;
      h.addEventListener('animationend',()=>h.remove(),{once:true});layer.appendChild(h);made++}
    return made}

  /* реакции на действия пользователя */
  document.addEventListener('pointerdown',e=>{
    const t=e.target;if(!t||!t.closest)return;
    if(t.closest('.home-scout-art')){react('happy');hearts(e)}
    else if(t.closest('.home-ask'))react('alert');
  },true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});
  setInterval(()=>{if(M.wrap&&M.wrap.isConnected){const m=emotionOf(M.wrap);if(m!==M.mood){M.mood=m;if(m==='happy')react('happy');if(m==='support')react('alert');wake()}}},250);

  /* ввод в render */
  const prevRender=render;
  render=function(...a){const r=prevRender.apply(this,a);try{mount()}catch(e){console.warn('[scout3d]',e)}return r};
  /* первый показ после текущей отрисовки */
  setTimeout(()=>{try{mount()}catch(e){}},0);

  NS.scout3d={
    react,hearts:n=>hearts(null,n),mood:m=>{if(MOODS[m]){M.mood=m;wake()}},
    get ready(){return M.ready},get failed(){return M.failed},get frames(){return M.frames},
    params:()=>Object.assign({},M.P),gaze:v=>{M.gaze=v},
    /* для тестов и скриншотов: поза на момент t и отрисовка */
    debugAt(t,over){if(!M.ready)return false;M.t=t;const keep=Object.assign({},M.P);PK.forEach(k=>M.P[k]=0);if(over)Object.assign(M.P,over);M.reacts=[];pose(t);draw();return keep},
    /* угол (в градусах) между осью взгляда глаза и направлением на камеру: насколько Скаут смотрит на пользователя */
    gazeError(){if(!M.ready)return null;const cam=[0,FIT.cy,FIT.dist],out={};
      for(const [eye,ax] of [['EyeL',[.059,.031,.998]],['EyeR',[-.018,.058,.998]]]){const e=M.byName[eye],f=qrot(e.wr,norm3(ax)),d=norm3([cam[0]-e.wp[0],cam[1]-e.wp[1],cam[2]-e.wp[2]]);out[eye]=Math.acos(Math.min(1,dot3(f,d)))*180/Math.PI}
      return out},
    /* доля непрозрачных пикселей и средняя яркость в центре — проверка, что модель реально нарисована */
    pixels(){if(!M.ready)return null;draw();const gl=M.gl,w=M.canvas.width,h=M.canvas.height,buf=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      let a=0,l=0,n=0;for(let i=0;i<buf.length;i+=16){n++;if(buf[i+3]>8){a++;l+=buf[i]+buf[i+1]+buf[i+2]}}
      /* наибольшая непрозрачность на рамке canvas: если >0, модель упирается в край и её срезает */
      let edge=0;for(let k=0;k<w;k++){for(const y of [0,1,h-2,h-1])edge=Math.max(edge,buf[(y*w+k)*4+3])}for(let k=0;k<h;k++){for(const x of [0,1,w-2,w-1])edge=Math.max(edge,buf[(k*w+x)*4+3])}
      return {coverage:a/n,lum:a?l/a/3:0,w,h,edge}},
    /* прозрачный кадр модели (для образцов в дизайн-системе) */
    snapshot(){if(!M.ready)return null;draw();return M.canvas.toDataURL('image/png')},
    noAnim:v=>{M.noAnim=!!v},freeze:v=>{M.freeze=!!v;if(!v)wake()},canvas:()=>M.canvas,version:20
  };
})();

/* ===== src/js/26-device.js ===== */
/* v20 · мокап iPhone 17 Pro вокруг прототипа (только режим презентации на широком экране) */
(function(){
  const app=document.getElementById('app');
  if(!app||!document.body.classList.contains('presentation-mode')||app.closest('.device'))return;
  const mk=(c,h)=>{const d=document.createElement('div');d.className=c;if(h)d.innerHTML=h;return d};
  const fit=mk('device-fit'),dev=mk('device'),body=mk('device-body');
  app.parentNode.insertBefore(fit,app);fit.appendChild(dev);dev.appendChild(body);body.appendChild(app);
  app.classList.add('in-device');
  [['l',118,32],['l',178,56],['l',246,56],['r',206,92],['r',690,60]].forEach(b=>{const x=mk('dv-btn '+b[0]);x.style.top=b[1]+'px';x.style.height=b[2]+'px';dev.appendChild(x)});
  const status=mk('dv-status',
    '<span class="dv-time">9:41</span><span class="dv-icons" aria-hidden="true">'+
    '<svg viewBox="0 0 19 12"><rect x="0" y="8" width="3" height="4" rx=".9"/><rect x="5" y="5.5" width="3" height="6.5" rx=".9"/><rect x="10" y="3" width="3" height="9" rx=".9"/><rect x="15" y="0" width="3" height="12" rx=".9"/></svg>'+
    '<svg viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1-1.1A10.7 10.7 0 0 0 8.5.8C5.6.8 3 1.9 1 3.7l1 1.1a9.2 9.2 0 0 1 6.5-2.5Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1-1.1a7 7 0 0 0-9.4 0l1 1.1c1-.9 2.3-1.4 3.7-1.4Zm0 3.5c.7 0 1.3.3 1.8.7L8.5 12 6.7 10.100c.5-.4 1.100-.7 1.800-.7Z"/></svg>'+
    '<svg viewBox="0 0 28 13"><rect x=".5" y=".5" width="24" height="12" rx="3.7" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="21" height="9" rx="2.6"/><path d="M26 4.5v4c.8-.3 1.500-1.100 1.500-2s-.7-1.700-1.500-2Z" opacity=".5"/></svg></span>');
  body.appendChild(status);body.appendChild(mk('dv-island'));body.appendChild(mk('dv-home'));
  /* светлые значки статуса на тёмных фонах: берём цвет под строкой статуса (сплошной или первый цвет градиента) */
  const lum=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,\/]+/).map(parseFloat);if(v.length>3&&v[3]<.5)return null;return(.2126*v[0]+.7152*v[1]+.0722*v[2])/255};
  const sync=()=>{let L=null;const r=app.getBoundingClientRect();
    const els=document.elementsFromPoint(r.left+r.width*.3,r.top+10*(r.width/402));
    for(const el of els){if(el.closest('.dv-status,.dv-island'))continue;const cs=getComputedStyle(el);
      L=lum(cs.backgroundColor);if(L==null&&/gradient/.test(cs.backgroundImage))L=lum(cs.backgroundImage);if(L!=null)break}
    if(L==null)L=document.body.classList.contains('dark')?0:1;
    status.classList.toggle('light',L<.5)};
  new MutationObserver(()=>setTimeout(sync,30)).observe(app,{childList:true});
  new MutationObserver(()=>setTimeout(sync,30)).observe(document.body,{attributes:true,attributeFilter:['class']});sync();
  const fitScale=()=>{const s=Math.min(1,(innerHeight-28)/898,(innerWidth-28)/426);fit.style.setProperty('--s',Math.max(.4,s).toFixed(4))};
  addEventListener('resize',fitScale);fitScale();
  window.podhvat=window.podhvat||{};window.podhvat.device={model:'iPhone 17 Pro',screen:[402,874],island:[126,37],radius:55,fit:fitScale,sync};
})();

/* ===== src/js/27-visual-v21.js ===== */
/* v21 · нижняя панель с главной кнопкой Скаута по центру, заголовок чата */
(function(){
  /* в автотестах без ?s3d=1 фон неподвижен: программная графика медленная и даёт нестабильные замеры; у людей анимация идёт всегда */
  try{if(navigator.webdriver&&!/[?&]s3d=1/.test(location.search))document.body.classList.add('lv-still')}catch(e){}
  const baseDock=dock,baseTab=tabFor;
  const PROFILE=['profile','edit-profile','pet','edit-pet','documents','document','awards','award','favorites','settings','history','history-case','update','stats','stories','notifications','lost-report','pet-qr','pet-collar'];
  tabFor=id=>PROFILE.includes(id)?'profile':baseTab(id);
  const face=()=>{try{return 'assets/scout-chip.webp'}catch(e){return 'assets/scout-chip.webp'}};
  dock=function(){
    if(!baseDock.apply(this,arguments))return '';
    const cur=tabFor(screen);
    const item=(id,icon,label)=>`<button data-go="${id}" class="${cur===id?'active':''}" ${cur===id?'aria-current="page"':''}>${I(icon)}<span>${label}</span></button>`;
    const hero=`<button data-go="home" class="dock-hero ${cur==='home'?'active':''}" ${cur==='home'?'aria-current="page"':''} aria-label="${T('Главная: Скаут','Home: Scout')}"><span class="hero-orb"><img src="${face()}" alt="" aria-hidden="true"></span><span class="hero-label">${T('Главная','Home')}</span></button>`;
    return `<nav class="dock" aria-label="${T('Главные разделы','Main sections')}">${item('nearby','map',T('Рядом','Nearby'))}${item('case','grid',T('Случай','Case'))}${hero}${item('chats','chat',T('Связь','Connect'))}${item('profile','user',T('Профиль','Profile'))}</nav>`;
  };
  /* заголовок чата: имя и статус рядом со стрелкой назад */
  const baseRender=render;
  render=function(){
    const r=baseRender.apply(this,arguments);
    try{
      const app=document.getElementById('app');
      if(!app.querySelector(':scope>.lv')){const lv=document.createElement('div');lv.className='lv';lv.setAttribute('aria-hidden','true');lv.innerHTML='<i></i><i></i>';app.prepend(lv)}
      /* кнопка «Попросить помощи» без стрелки; кнопка профиля в шапке убрана (профиль теперь в нижней панели), на её месте пустой отступ */
      /* главная: без дубля чата («Пока нет созданного случая»), самопомощь развёрнута */
      if(screen==='home'){
        app.querySelectorAll('.empty-case-card').forEach(n=>n.remove());
        const entry=app.querySelector('.self-help-entry');
        if(entry&&typeof SELF_HELP!=='undefined'&&!app.querySelector('.sh-home')){
          const ids=['first','injured','cat','wild','owner','lost'];
          const list=ids.map(id=>SELF_HELP.find(a=>a.id===id)).filter(Boolean);
          const sec=document.createElement('section');sec.className='sh-home';sec.setAttribute('aria-labelledby','sh-home-t');
          sec.innerHTML=`<div class="sh-home-head"><div><h2 id="sh-home-t">Самопомощь</h2><p>Короткие подсказки, когда важно понять следующий шаг.</p></div></div><div class="help-grid">${list.map(helpTile).join('')}</div><button class="sh-home-all" data-go="knowledge"><span>Все подсказки</span><b>${SELF_HELP.length}</b>${I('arrow')}</button>`;
          entry.replaceWith(sec);
          if(lang==='en'&&window.podhvat&&window.podhvat.i18n)window.podhvat.i18n.translate(sec);
        }
      }
      app.querySelectorAll('.home-ask .icon').forEach(i=>i.remove());
      app.querySelectorAll('.app-header [data-go="profile"],.app-header [data-action="go-profile"]').forEach(b=>{const sp=document.createElement('span');sp.className='hdr-spacer';sp.setAttribute('aria-hidden','true');b.replaceWith(sp)});
      app.querySelectorAll('.guided-header').forEach(h=>{if(h.querySelector('.chat-title'))return;
        const t=document.createElement('div');t.className='chat-title';
        t.innerHTML=`<b>${T('Скаут','Scout')}</b><small>${T('Рядом, помогаю по шагам','Here, one step at a time')}</small>`;
        const back=h.querySelector('.guided-back');back?back.after(t):h.prepend(t)});
    }catch(e){}
    return r;
  };
})();

/* ===== src/js/28-v212.js ===== */
/* v21.2 · статьи без лишнего, разные страницы «Чип» и «Прививки», бирка-пример с QR,
   окна и подсказки внутри экрана телефона, «Связаться» под достижениями, расшифровка достижений */
(function(){
  const L=T;
  const H=s=>e(String(s==null?'':s));

  /* ---------- 1. статьи: без «О подсказке и источниках» и без кнопки «Все подсказки» внизу ---------- */
  const baseArticle=V.article;
  V.article=function(){
    return baseArticle.apply(this,arguments)
      .replace(/<details class="help-editorial">[\s\S]*?<\/details>/,'')
      .replace(/<button class="button secondary" data-go="knowledge">[\s\S]*?<\/button>(?=<\/article>)/,'');
  };

  /* ---------- 2. «Чип» и «Прививки и паспорт»: разные страницы ---------- */
  let docKind='chip';
  window.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-doc]');if(b)docKind=b.dataset.doc},true);
  const lines=s=>String(s||'').split(/\n|;/).map(x=>x.trim()).filter(Boolean);
  const baseDocs=V.documents;
  V.documents=function(){
    let n=0;
    const vac=lines(state.profile.vaccines).length+lines(state.profile.passport).length;
    return baseDocs.apply(this,arguments)
      .replace(/<button class="list-row" data-go="document">/g,()=>`<button class="list-row" data-go="document" data-doc="${['chip','vaccines'][n++]||'chip'}">`)
      .replace(/<small>(Сведения|Details)<\/small>/,`<small>${vac?L('Записей: '+vac,'Records: '+vac):L('Пока пусто','Nothing yet')}</small>`);
  };
  const regNote=()=>`<p class="doc-note">${I('info')}<span>${L('Запись здесь не является подтверждением из государственного реестра. Интеграция не подключена.','This entry is not verification from a government registry. No integration is connected.')}</span></p>`;
  const chipView=()=>{
    const p=state.profile,digits=String(p.chip||'').replace(/\s+/g,''),has=!!digits;
    const groups=digits.replace(/(\d{3})(?=\d)/g,'$1 ');
    const masked=digits.length>3?groups.replace(/\d(?=[\d ]*\d{3}$)/g,'•'):groups;
    return `<h1>${L('Чип','Chip')}</h1>
<section class="card doc-chip"><div class="doc-chip-top"><span class="doc-chip-ico">${I('shield')}</span><div><b>${H(p.petName)}</b><small>${has?L('Номер указан','Number provided'):L('Номер не указан','No number yet')}</small></div></div>
${has?`<div class="doc-chip-num" data-chip-num data-full="${H(groups)}" data-mask="${H(masked)}" data-shown="0" aria-live="polite">${H(masked)}</div><button class="button secondary" data-chip-toggle>${I('search')}<span>${L('Показать номер','Show number')}</span></button>`
:`<p class="doc-chip-empty">${L('Номер чипа (15 цифр) указан в ветеринарном паспорте или договоре. Если его нет, ветеринар считает чип сканером.','The chip number (15 digits) is in the vet passport or contract. If you do not have it, a vet can read the chip with a scanner.')}</p>`}</section>
<section class="card doc-how"><h3>${L('Как найти номер','Where to find the number')}</h3><ol><li>${L('Ветеринарный паспорт: страница с наклейкой чипа.','Vet passport: the page with the chip sticker.')}</li><li>${L('Договор или справка клиники, где ставили чип.','The contract or certificate from the clinic that implanted it.')}</li><li>${L('Ветеринар: быстро считает чип сканером.','A vet can read the chip with a scanner in a minute.')}</li></ol></section>
${regNote()}<button class="button" data-go="edit-pet">${has?L('Изменить номер','Change number'):L('Указать номер','Add number')}</button>`;
  };
  const vaccinesView=()=>{
    const p=state.profile,v=lines(p.vaccines),ps=lines(p.passport);
    const list=a=>`<ul class="doc-list">${a.map(x=>`<li><span class="doc-tick">${I('check')}</span><span>${H(x)}</span></li>`).join('')}</ul>`;
    return `<h1>${L('Прививки и паспорт','Vaccinations and passport')}</h1>
<section class="card doc-vacc"><div class="doc-sec-head"><h3>${L('Прививки','Vaccinations')}</h3><span class="doc-count">${v.length}</span></div>${v.length?list(v):`<p class="doc-empty">${L('Записей нет. Добавьте вид прививки и дату, например «Бешенство, 12.03».','No records. Add the vaccine and date, for example “Rabies, 12.03”.')}</p>`}</section>
<section class="card doc-pass"><div class="doc-sec-head"><h3>${L('Паспорт и примечания','Passport and notes')}</h3><span class="doc-count">${ps.length}</span></div>${ps.length?list(ps):`<p class="doc-empty">${L('Серия и номер паспорта, особые отметки, аллергии.','Passport series and number, special notes, allergies.')}</p>`}</section>
${regNote()}<button class="button" data-go="edit-pet">${L('Добавить запись','Add a record')}</button>`;
  };
  V.document=()=>docKind==='vaccines'?vaccinesView():chipView();
  window.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-chip-toggle]');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const n=document.querySelector('[data-chip-num]');if(!n)return;
    const on=n.dataset.shown!=='1';n.dataset.shown=on?'1':'0';n.textContent=on?n.dataset.full:n.dataset.mask;
    b.querySelector('span').textContent=on?L('Скрыть номер','Hide number'):L('Показать номер','Show number');
  },true);

  /* ---------- 3. бирка-пример с QR (вымышленные данные) ---------- */
  const QR_URL='https://podhvat.example/t/K7F29X';
  if(!SCREEN_REGISTRY.some(s=>s[0]==='pet-qr'))SCREEN_REGISTRY.push(['pet-qr','Бирка с QR','QR tag','Профиль','Пример бирки с QR-кодом на вымышленных данных: что записано в коде и что увидит нашедший.']);
  V['pet-qr']=()=>`<h1>${L('Бирка с QR','QR tag')}</h1>
<span class="badge lime qr-demo-badge">${L('Пример · данные вымышленные','Example · fictional data')}</span>
<section class="qr-tag-wrap" aria-label="${L('Бирка для ошейника','Collar tag')}"><div class="qr-tag"><i class="qr-hole" aria-hidden="true"></i><div class="qr-plate">${qrSvg(QR_URL,{quiet:1,label:L('QR-код бирки-примера','Example tag QR code')})}</div><b>${L('Нашли меня?','Found me?')}</b><small>${L('Наведите камеру','Point your camera')}</small></div></section>
<section class="card qr-found"><h3>${L('Что увидит нашедший','What the finder sees')}</h3>
<div class="qr-found-top"><img src="assets/cat.png" alt=""><div><b>${L('Барсик','Barsik')}</b><small>${L('Кот, серый с белой грудкой','Cat, grey with a white chest')}</small></div></div>
<ul class="qr-found-list"><li>${I('pin')}<span>${L('Район: Центральный (пример)','Area: Central (example)')}</span></li><li>${I('info')}<span>${L('Приметы: белое пятно на груди, зелёный ошейник','Marks: white chest patch, green collar')}</span></li><li>${I('shield')}<span>${L('Телефон и адрес скрыты. Сообщение владельцу уходит через Подхват','Phone and address hidden. The message goes through Podhvat')}</span></li></ul>
<div class="qr-fake-btn" aria-disabled="true">${I('chat')}${L('Написать владельцу','Message the owner')}</div></section>
<section class="card qr-inside"><h3>${L('Что записано в QR','What is inside the QR')}</h3><p class="qr-link">${H(QR_URL)}</p><p class="qr-note">${L('Только короткий код. Имя, телефон и адрес в QR не записываются: их нельзя прочитать с бирки.','Only a short code. Name, phone and address are not stored in the QR, so they cannot be read from the tag.')}</p></section>
<button class="button" data-action="qr-copy">${L('Копировать ссылку','Copy link')}</button><button class="button secondary" data-go="pet">${L('К питомцу','Back to pet')}</button>`;
  window.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-action="pet-qr"],[data-action="qr-copy"]');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    if(b.dataset.action==='pet-qr'){go('pet-qr');return}
    try{navigator.clipboard.writeText(QR_URL).then(()=>toast(L('Ссылка скопирована','Link copied')),()=>toast(QR_URL))}catch(err){toast(QR_URL)}
  },true);

  /* ---------- 4. окна и подсказки внутри экрана телефона ---------- */
  const body=app.closest('.device-body');
  const toastEl=document.getElementById('toast');
  if(body){body.appendChild(modal);if(toastEl)body.appendChild(toastEl)}
  const inDevice=()=>!!body&&matchMedia('(min-width:601px)').matches;
  let scrim=null;
  const dropScrim=()=>{if(scrim){scrim.remove();scrim=null}};
  const nativeShow=modal.showModal.bind(modal);
  modal.showModal=function(){
    if(!inDevice()){this.classList.remove('inphone');nativeShow();return}
    this.classList.add('inphone');dropScrim();
    scrim=document.createElement('div');scrim.className='dv-scrim';scrim.addEventListener('click',()=>{try{closeModal()}catch(err){modal.close()}});
    body.insertBefore(scrim,modal);
    this.show();
    const f=this.querySelector('button,[href],input');if(f)f.focus({preventScroll:true});
  };
  modal.addEventListener('close',()=>{dropScrim();modal.classList.remove('inphone')});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&modal.open&&modal.classList.contains('inphone')){ev.preventDefault();try{closeModal()}catch(err){modal.close()}}});

  /* ---------- 5. достижения помощников: значок, как получено, за что, что значит ---------- */
  const ACH=[
    [/передерж|stays/i,'Считается по завершённым передержкам, которые подтвердили владелец или организация.','За каждую передержку, доведённую до итога: животное принято, о нём заботились, итог записан.','Помощник уже принимал животных на время, и это проверено на практике.','Counted from finished stays confirmed by the owner or the organisation.','For every stay taken to an outcome: the animal was taken in, cared for, the outcome recorded.','The helper has taken animals in before, and it is confirmed in practice.'],
    [/поездк|rides/i,'Считается по выездам на место, которые подтвердили участники случая.','За завершённые поездки: забрать животное, довезти до клиники, отвезти корм.','Помощник умеет быстро добраться и довезти, на него можно рассчитывать в срочных случаях.','Counted from trips confirmed by the people in the case.','For finished trips: picking an animal up, taking it to a clinic, delivering supplies.','The helper can get there and bring the animal quickly, a good choice for urgent cases.'],
    [/вовремя|on time/i,'Выдаётся автоматически, если помощник приезжал в согласованное время в большинстве выездов.','За пунктуальность: приехал в то окно времени, о котором договорились.','На помощника можно рассчитывать в назначенный час, не нужно ждать без сроков.','Given automatically when the helper arrived in the agreed time window on most trips.','For punctuality: arrived in the window you agreed on.','You can count on the helper at the agreed hour, with no open-ended waiting.'],
    [/быстр|fast/i,'Выдаётся автоматически по скорости первого ответа на запросы за последние 30 дней.','За быстрые ответы: первый ответ приходит в течение 15 минут в большинстве запросов.','Помощник быстро отвечает, поэтому ему удобно писать в срочных ситуациях.','Given automatically for the speed of the first reply to requests over the last 30 days.','For quick replies: the first reply arrives within 15 minutes on most requests.','The helper replies quickly, so it is a good person to write to in urgent situations.'],
    [/провер|verified/i,'Подтверждены контакты и личность или документы организации. Проверка выполнена в Подхвате.','За прохождение проверки: контакты подтверждены, сведения совпадают с документами.','Профиль настоящий. Отметка не гарантирует результат помощи, она говорит только о проверенных данных.','Contacts and identity, or the organisation’s documents, are confirmed in Podhvat.','For passing the check: contacts confirmed, details match the documents.','The profile is real. The mark does not guarantee the outcome, it only says the details were checked.'],
    [/октябр|october/i,'Сезонное отличие: выдаётся тем, кто в октябре довёл до итога несколько случаев.','За тёплый вклад в месяце: помощь, которая закончилась хорошим итогом.','Помощник был особенно активен в этом месяце. Отличие со временем исчезает из ряда сезонных.','A seasonal mark for those who took several cases to an outcome in October.','For a warm contribution during the month: help that ended well.','The helper was especially active this month. The mark leaves the seasonal row after the season.'],
    [/опыт|expert/i,'Выдаётся по числу завершённых случаев с собаками, в том числе с напуганными.','За опыт: помощник уже справлялся с собаками, которые боятся людей.','Помощника можно просить о случаях с осторожными и напуганными собаками.','Given for the number of finished cases with dogs, including frightened ones.','For experience: the helper has handled dogs that are afraid of people.','You can ask the helper about cases with careful or frightened dogs.'],
    [/поиск|search/i,'Считается по завершённым поискам хозяина, где помощник участвовал.','За поиски: помог найти хозяина или сопоставить находку с объявлением.','Помощник знает, как проверять приметы и общаться с владельцами.','Counted from finished owner searches the helper took part in.','For searches: helped find an owner or match a find with a notice.','The helper knows how to check marks and talk to owners.'],
    [/лиценз|licen[sc]ed/i,'Лицензия организации проверена по документам при подключении.','За проверенную лицензию на работу с животными.','Организация работает официально. Срок и номер лицензии указаны в документах.','The organisation’s licence was checked against documents when it joined.','For a verified licence to work with animals.','The organisation operates officially. The licence term and number are in the documents.'],
    [/экстрен|urgent/i,'Выдаётся организации, которая принимает животных в нерабочее время и по сигналу срочности.','За готовность принять срочный случай вне графика.','Сюда можно обратиться ночью и в выходные, но заранее напишите, что случай срочный.','Given to an organisation that takes animals out of hours and on an urgent signal.','For being ready to take an urgent case outside the schedule.','You can contact them at night and on weekends, but say in advance that it is urgent.'],
    [/дик|wild/i,'Выдаётся по подтверждённому опыту с дикими животными и птицами.','За работу с дикой природой: птенцы, ежи, раненые птицы.','Помощник знает, когда дикое животное нельзя трогать, и подскажет безопасные шаги.','Given for confirmed experience with wild animals and birds.','For work with wildlife: chicks, hedgehogs, injured birds.','The helper knows when a wild animal must not be touched and will suggest safe steps.'],
    [/пристро|rehomed/i,'Считается по случаям, которые закончились новым домом и были подтверждены.','За каждого пристроенного питомца с подтверждённым итогом.','Организация довела до нового дома столько животных. Это итог, а не обещание.','Counted from cases that ended with a new home and were confirmed.','For every pet rehomed with a confirmed outcome.','The organisation has found this many animals a new home. It is an outcome, not a promise.'],
    [/достав|delivery/i,'Выдаётся магазину, который доставляет нужное в первые сутки по району.','За доставку за день: корм, переноски и миски приезжают быстро.','Магазин успевает привезти нужное, пока животное у вас на передержке.','Given to a shop that delivers essentials within the first day in the area.','For same-day delivery: food, carriers and bowls arrive quickly.','The shop can deliver what you need while the animal is staying with you.']
  ];
  const achInfo=n=>{const r=ACH.find(a=>a[0].test(n));const o=lang==='ru'?1:4;
    return r?{how:r[o],why:r[o+1],means:r[o+2]}:{how:L('Выдаётся автоматически по подтверждённым действиям в Подхвате.','Given automatically for confirmed actions in Podhvat.'),why:L('За полезные шаги, которые подтвердили участники случая.','For helpful steps confirmed by the people in the case.'),means:L('Отличие нельзя купить: оно показывает проверенную историю помощи.','The mark cannot be bought: it shows a verified history of help.')}};
  window.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-v18^="ach:"]');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const name=b.dataset.name||b.getAttribute('aria-label')||'',info=achInfo(name);
    modalFocus=document.activeElement;
    modal.innerHTML=`<div class="ach-sheet"><span class="ach-ico" aria-hidden="true">${b.innerHTML}</span><h2>${H(name)}</h2>
<section><h3>${L('Как получено','How it was earned')}</h3><p>${H(info.how)}</p></section>
<section><h3>${L('За что','What for')}</h3><p>${H(info.why)}</p></section>
<section><h3>${L('Что значит','What it means')}</h3><p>${H(info.means)}</p></section></div><div class="stack">${button(L('Закрыть','Close'),'dismiss','secondary')}</div>`;
    modal.showModal();
  },true);

  /* награды профиля: значок, условие, как и за что, что значит */
  const AW={
    first:{icon:'heart',how:['Случай опубликован, а данные о животном подтверждены: фото, место и время.','The case was published and the animal details were confirmed: photo, place and time.'],means:['Вы сделали первый шаг: животное теперь видно тем, кто может помочь.','You took the first step: the animal is now visible to people who can help.']},
    agreement:{icon:'chat',how:['Помощник подтвердил задачу, а вы согласовали контакты.','A helper confirmed the task and you agreed on contacts.'],means:['Помощь договорена и записана: у задачи есть исполнитель и срок.','The help is agreed and recorded: the task has an assignee and a deadline.']},
    closed:{icon:'check',how:['Случай закрыт с указанным итогом: найден хозяин, пристроено или передано специалисту.','The case was closed with a recorded outcome: owner found, rehomed or handed to a specialist.'],means:['История сохранена: по ней видно, чем всё закончилось, и она пригодится в следующий раз.','The story is saved: it shows how it ended and will help next time.']}
  };
  const baseAward=V.award;
  V.award=function(){
    const a=awardData().find(x=>x.id===awardId)||awardData()[0],meta=AW[a.id]||AW.first,got=state.awards&&state.awards[a.id];
    const date=got?new Date(got).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{timeZone:'Europe/Moscow'}):'';
    const o=lang==='ru'?0:1;
    return `<h1>${H(a.title)}</h1><div class="award-hero2 ${got?'got':'locked'}"><span class="award-medal" aria-hidden="true">${I(meta.icon)}</span><div><b>${got?L('Получено','Earned'):L('Пока не получено','Not earned yet')}</b><small>${got?H(date):L('Награда откроется, когда выполните условие','Unlocks when you meet the condition')}</small></div></div>
<section class="card award-info"><h3>${L('Условие','Condition')}</h3><p>${H(a.rule)}</p></section>
<section class="card award-info"><h3>${got?L('Как получено','How it was earned'):L('Как получить','How to earn it')}</h3><p>${H(meta.how[o])}</p></section>
<section class="card award-info"><h3>${L('Что значит','What it means')}</h3><p>${H(meta.means[o])}</p></section>
<button class="button" data-go="home">${L('Продолжить помогать','Continue helping')}</button>`;
  };

  /* ---------- 6. render: заголовок документа, «Связаться» под достижениями ---------- */
  const baseRender=render;
  render=function(){
    const r=baseRender.apply(this,arguments);
    try{
      const pg=app.querySelector('.screen:not(.screen-outgoing)');
      if(pg){
        if(screen==='document'){const hc=pg.querySelector('.header-center');if(hc&&hc.firstChild)hc.firstChild.textContent=docKind==='vaccines'?L('Прививки и паспорт','Vaccinations and passport'):L('Чип','Chip')}
        if(screen==='pet'){const b=pg.querySelector('[data-action="pet-qr"]');if(b)b.textContent=L('Бирка с QR · пример','QR tag · example')}
        const c=pg.querySelector('.h-contact'),sec=pg.querySelector('.h-ach-sec');
        if(c&&sec&&!sec.nextElementSibling?.classList?.contains('h-contact-wrap')){
          c.classList.remove('secondary');
          const w=document.createElement('div');w.className='h-contact-wrap';w.appendChild(c);sec.after(w);
        }
      }
    }catch(err){}
    return r;
  };
})();

/* ===== src/js/29-v214.js ===== */
/* v21.4 · цветовые теги окраса, иконки случая рядом с сердечком, чат по случаю без нижней панели */
(function(){
  /* выбор цветовых тегов в форме «Приметы и место» */
  window.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('.ctag[data-colour]');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');
    const box=b.closest('.colour-field'),inp=box.querySelector('#animal-color');
    inp.value=[...box.querySelectorAll('.ctag[aria-pressed="true"]')].map(x=>x.dataset.colour).join(',');
  },true);

  /* чат по случаю — без нижней панели */
  const baseDock=dock;
  dock=function(){return screen==='chat'?'':baseDock.apply(this,arguments)};

  const baseRender=render;
  render=function(){
    const r=baseRender.apply(this,arguments);
    try{
      const pg=app.querySelector('.screen:not(.screen-outgoing)');
      if(pg){
        pg.classList.toggle('no-dock',!pg.querySelector('.dock'));
        if(screen==='case'){
          const head=pg.querySelector('.case-heading'),mini=pg.querySelector('.mini-actions');
          if(head&&mini&&!head.querySelector('.ch-actions')){
            const heart=head.querySelector('.icon-button'),g=document.createElement('div');g.className='ch-actions';
            [...mini.children].forEach(n=>g.appendChild(n));
            if(heart)g.appendChild(heart);
            head.appendChild(g);mini.remove();
          }
        }
      }
    }catch(err){}
    return r;
  };
})();

/* ===== src/js/30-v215.js ===== */
/* v21.5 · типограф (предлоги не висят в конце строки), «Напечатать ошейник» (экран, PDF, статья) */
(function(){
  const L=(ru,en)=>lang==='ru'?ru:en;
  /* ---------- 1. типографика: неразрывные пробелы после коротких слов ---------- */
  const NB=' ';
  const RU='и|в|во|на|с|со|к|ко|о|об|от|до|по|за|из|у|а|но|да|не|ни|что|как|для|при|без|под|над|про|или|либо|если|чтобы|это|то|так|он|она|оно|они|мы|вы|их|её|ее|где|когда|уже|ещё|еще|тут|там|вот|лишь';
  const EN='a|an|the|to|of|in|on|at|by|or|is|it|as|if|no|so|we|and|for|but|not|you|are|be|do|my|I';
  const reRU=new RegExp(`(?<![\\p{L}\\p{N}])(${RU}) (?=\\S)`,'giu');
  const reEN=new RegExp(`(?<![\\p{L}\\p{N}])(${EN}) (?=\\S)`,'gu');
  const reUnit=/(\d) (?=(?:мин|км|м|г|кг|мл|см|мм|шт|ч|сек|₽|руб|из|of|min|km|cm|mm|kg|g|ml|h)(?![\p{L}]))/gu;
  const reDash=/ (?=[—–] )/g;
  const reNo=/(№|#) (?=\d)/g;
  function tp(s){
    if(!s||s.length<3)return s;
    let r=s.replace(reDash,NB).replace(reUnit,'$1'+NB).replace(reNo,'$1'+NB);
    r=/[А-Яа-яЁё]/.test(r)?r.replace(reRU,'$1'+NB):r.replace(reEN,'$1'+NB);
    return r;
  }
  const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','PRE','TITLE','SVG','CANVAS','OPTION']);
  function walk(root){
    if(!root)return;
    if(root.nodeType===3){const p=root.parentNode;if(p&&!SKIP.has(p.nodeName.toUpperCase())&&!p.closest?.('[data-notypo]')){const v=tp(root.nodeValue);if(v!==root.nodeValue)root.nodeValue=v}return}
    if(root.nodeType!==1||SKIP.has(root.nodeName.toUpperCase())||root.closest?.('[data-notypo],svg'))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;return p&&!SKIP.has(p.nodeName.toUpperCase())&&!p.closest('[data-notypo],svg')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
    const list=[];while(w.nextNode())list.push(w.currentNode);
    for(const n of list){const v=tp(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
  }
  window.podhvat=window.podhvat||{};
  window.podhvat.typo={tp,walk};
  /* автотесты (navigator.webdriver) сравнивают строки с обычным пробелом, поэтому там типограф выключен, если нет ?typo=1 */
  const typoOn=!navigator.webdriver||/[?&]typo=1/.test(location.search);
  window.podhvat.typo.enabled=typoOn;
  if(typoOn){
    const mo=new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)walk(n)});
    mo.observe(document.body,{childList:true,subtree:true});
    walk(document.body);
    const renderBefore215=render;
    render=function(...a){const r=renderBefore215.apply(this,a);try{walk(app);walk(document.getElementById('modal'))}catch(err){}return r};
  }

  /* ---------- 2. «Напечатать ошейник» ---------- */
  const QR_URL='https://podhvat.example/t/K7F29X';
  const MM=300/25.4,FONT='"Inter","Segoe UI",Roboto,Arial,sans-serif';
  const C={lime:'#DBF95B',lime2:'#C8E83C',lime3:'#EEFBA8',ink:'#1E2023',gray:'#5B666A',white:'#FFFFFF'};
  const CS=()=>{state.collar=state.collar||{};if(typeof state.collar.phone!=='boolean')state.collar.phone=true;if(!state.collar.size)state.collar.size='dog';return state.collar};
  const LEN={cat:235,dog:273};
  const imgCache={};
  const loadImg=src=>imgCache[src]||(imgCache[src]=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src}));
  const rr=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
  const fit=(c,txt,maxW,px,weight)=>{let s=px;for(;;){c.font=`${weight} ${s}px ${FONT}`;if(c.measureText(txt).width<=maxW||s<px*.42)break;s-=px*.04}return s};
  const wrap=(c,txt,maxW)=>{const out=[];let line='';for(const w of tp(txt).split(' ')){const t=line?line+' '+w:w;if(c.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t}if(line)out.push(line);return out};
  function paw(c,x,y,s){c.save();c.translate(x,y);c.beginPath();c.ellipse(0,s*.25,s*.42,s*.34,0,0,7);c.fill();for(const [dx,dy] of [[-.55,-.2],[-.2,-.58],[.2,-.58],[.55,-.2]]){c.beginPath();c.ellipse(dx*s,dy*s,s*.17,s*.22,0,0,7);c.fill()}c.restore()}
  function drawQR(c,x,y,size){const g=qrMatrix(QR_URL),n=g.length,ms=Math.max(1,Math.floor(size/n)),ox=x+Math.round((size-ms*n)/2),oy=y+Math.round((size-ms*n)/2);c.fillStyle=C.ink;for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(g[r][q])c.fillRect(ox+q*ms,oy+r*ms,ms,ms)}
  function profileData(o){const p=state.profile||{};const ex=o&&o.example;return{name:(ex?'Марта':(p.petName||'Питомец')).trim()||'Питомец',phone:ex?'+7 900 123-45-67':String(p.contact||'').trim()}}
  /* одна полоса ошейника; k — пикселей на миллиметр */
  function drawStrip(c,k,x0,y0,o){
    const m=v=>v*k,L=o.len,H=38,d=profileData(o),showPhone=o.phone&&d.phone;
    c.save();c.lineJoin='round';
    rr(c,m(x0),m(y0),m(L),m(H),m(6));c.fillStyle=C.lime;c.fill();
    c.save();rr(c,m(x0),m(y0),m(L),m(H),m(6));c.clip();
    c.fillStyle=C.lime2;c.globalAlpha=.5;let row=0;for(let y=y0+6;y<y0+H;y+=14,row++)for(let x=x0+30+(row%2)*10;x<x0+L-4;x+=20)paw(c,m(x),m(y),m(2.2));c.globalAlpha=1;
    /* нахлёст */
    c.fillStyle=C.lime3;c.fillRect(m(x0),m(y0),m(22),m(H));
    c.strokeStyle=C.lime2;c.lineWidth=m(.5);for(let i=-H;i<22+H;i+=3.2){c.beginPath();c.moveTo(m(x0+i),m(y0+H));c.lineTo(m(x0+i+H),m(y0));c.stroke()}
    c.restore();
    c.setLineDash([m(2),m(1.4)]);c.strokeStyle=C.ink;c.lineWidth=m(.3);c.beginPath();c.moveTo(m(x0+22),m(y0));c.lineTo(m(x0+22),m(y0+H));c.stroke();
    rr(c,m(x0),m(y0),m(L),m(H),m(6));c.stroke();c.setLineDash([]);
    c.fillStyle=C.ink;c.font=`600 ${m(2.5)}px ${FONT}`;c.textAlign='center';c.fillText('нахлёст',m(x0+11),m(y0+H/2+1));c.textAlign='left';
    /* Скаут */
    const cx=x0+22+4+11,cy=y0+19;c.beginPath();c.arc(m(cx),m(cy),m(11),0,7);c.fillStyle=C.white;c.fill();
    if(o.scout){c.save();c.beginPath();c.arc(m(cx),m(cy),m(10.4),0,7);c.clip();const s=o.scout,sz=Math.min(s.width,s.height);c.drawImage(s,(s.width-sz)/2,(s.height-sz)*.18,sz,sz,m(cx-10.4),m(cy-10.4),m(20.8),m(20.8));c.restore()}
    c.lineWidth=m(.5);c.strokeStyle=C.ink;c.beginPath();c.arc(m(cx),m(cy),m(11),0,7);c.stroke();
    /* панель с именем */
    const qrW=32,textW=56,infoX=x0+52,infoW=L-52-(4+qrW+4+textW)-6;
    rr(c,m(infoX),m(y0+4),m(infoW),m(30),m(4));c.fillStyle=C.white;c.fill();
    const px=infoX+5,iw=infoW-10;
    c.fillStyle=C.gray;c.font=`700 ${m(2.5)}px ${FONT}`;if('letterSpacing'in c)c.letterSpacing=`${m(.35)}px`;c.fillText('МЕНЯ ЗОВУТ',m(px),m(y0+10));if('letterSpacing'in c)c.letterSpacing='0px';
    c.fillStyle=C.ink;const ns=fit(c,d.name,m(iw),m(9.5),700);c.font=`700 ${ns}px ${FONT}`;c.fillText(d.name,m(px),m(y0+19.4));
    if(showPhone){c.fillStyle=C.gray;c.font=`500 ${m(2.8)}px ${FONT}`;c.fillText('Если я одна — позвоните',m(px),m(y0+25.6));c.fillStyle=C.ink;const ps=fit(c,d.phone,m(iw),m(6.4),700);c.font=`700 ${ps}px ${FONT}`;c.fillText(d.phone,m(px),m(y0+31.6))}
    else{c.fillStyle=C.gray;c.font=`500 ${m(3)}px ${FONT}`;wrap(c,'Отсканируйте QR — хозяин получит сообщение',m(iw)).slice(0,2).forEach((t,i)=>c.fillText(t,m(px),m(y0+26.5+i*4)))}
    /* QR */
    const qx=infoX+infoW+4;rr(c,m(qx),m(y0+3),m(qrW),m(qrW),m(4));c.fillStyle=C.white;c.fill();drawQR(c,m(qx+2.6),m(y0+3+2.6),m(qrW-5.2));
    /* текст справа */
    const tx=qx+qrW+4;c.fillStyle=C.ink;const ts=fit(c,'Нашли меня?',m(textW),m(5.6),800);c.font=`800 ${ts}px ${FONT}`;c.fillText('Нашли меня?',m(tx),m(y0+13));
    c.font=`500 ${m(2.9)}px ${FONT}`;wrap(c,'Наведите камеру на QR — хозяин получит сообщение',m(textW)).slice(0,3).forEach((t,i)=>c.fillText(t,m(tx),m(y0+19.2+i*3.8)));
    c.font=`800 ${m(3.4)}px ${FONT}`;c.fillText('Подхват',m(tx),m(y0+H-5.5));
    /* линейка от линии нахлёста, см */
    c.strokeStyle=C.ink;c.lineWidth=m(.22);c.fillStyle=C.ink;c.font=`600 ${m(2)}px ${FONT}`;
    for(let cm=1;cm*10<=L-22-6;cm++){const x=x0+22+cm*10,big=cm%5===0;c.beginPath();c.moveTo(m(x),m(y0+H));c.lineTo(m(x),m(y0+H-(big?2.6:1.5)));c.stroke();if(big)c.fillText(String(cm),m(x+.7),m(y0+H-.9))}
    c.restore();
  }
  function page1(o,scout){
    const cv=document.createElement('canvas');cv.width=Math.round(297*MM);cv.height=Math.round(210*MM);const c=cv.getContext('2d'),m=v=>v*MM;
    c.fillStyle=C.white;c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle=C.ink;c.font=`800 ${m(6.2)}px ${FONT}`;c.fillText('Бумажный ошейник',m(12),m(14));
    c.fillStyle=C.gray;c.font=`500 ${m(3.2)}px ${FONT}`;wrap(c,'Печать на A4, масштаб 100% (без «подгонки под поля»). Вырежьте по пунктиру, склейте на нахлёсте: под ошейник должны проходить два пальца.',m(190)).forEach((t,i)=>c.fillText(t,m(12),m(20+i*4.2)));
    c.fillStyle=C.ink;c.font=`800 ${m(4)}px ${FONT}`;c.textAlign='right';c.fillText('Подхват',m(285),m(14));c.textAlign='left';
    if(o.example){c.fillStyle=C.gray;c.font=`600 ${m(2.8)}px ${FONT}`;c.textAlign='right';c.fillText('Пример · вымышленные данные',m(285),m(20));c.textAlign='left'}
    for(let i=0;i<4;i++)drawStrip(c,MM,12,28+i*45,{...o,scout});
    c.fillStyle=C.gray;c.font=`500 ${m(2.8)}px ${FONT}`;c.fillText('Четыре одинаковые полосы: запасные пригодятся, если ошейник намокнет или износится. Линейка внизу полосы — в сантиметрах от линии нахлёста.',m(12),m(206));
    return cv;
  }
  function page2(o){
    const cv=document.createElement('canvas');cv.width=Math.round(297*MM);cv.height=Math.round(210*MM);const c=cv.getContext('2d'),m=v=>v*MM;
    c.fillStyle=C.white;c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle=C.ink;c.font=`800 ${m(6.2)}px ${FONT}`;c.fillText('Как пользоваться ошейником',m(12),m(16));
    c.font=`800 ${m(4)}px ${FONT}`;c.textAlign='right';c.fillText('Подхват',m(285),m(16));c.textAlign='left';
    const steps=[['Напечатайте','Формат A4, масштаб 100%. Лучше на плотной бумаге 160–200 г, в цвете.'],['Вырежьте и укрепите','Вырежьте по пунктиру. Заклейте прозрачным скотчем или заламинируйте, чтобы бумага не размокла.'],['Склейте по размеру','Наложите края на нахлёст так, чтобы под ошейник проходили два пальца. Лишнее можно подрезать.'],['Проверяйте каждый день','Бумага мнётся и мокнет. Если QR или текст стёрлись, замените полосу. Ошейник не для постоянной носки.']];
    steps.forEach(([h,t],i)=>{const y=32+i*40;c.beginPath();c.arc(m(20),m(y+3),m(6),0,7);c.fillStyle=C.lime;c.fill();c.lineWidth=m(.4);c.strokeStyle=C.ink;c.stroke();c.fillStyle=C.ink;c.font=`800 ${m(6)}px ${FONT}`;c.textAlign='center';c.fillText(String(i+1),m(20),m(y+5.2));c.textAlign='left';c.font=`700 ${m(4.6)}px ${FONT}`;c.fillText(h,m(32),m(y+2));c.fillStyle=C.gray;c.font=`500 ${m(3.5)}px ${FONT}`;wrap(c,t,m(100)).forEach((l,j)=>c.fillText(l,m(32),m(y+9+j*5)))});
    rr(c,m(155),m(26),m(130),m(78),m(7));c.fillStyle=C.lime;c.fill();c.fillStyle=C.ink;c.font=`800 ${m(5.2)}px ${FONT}`;c.fillText('Когда он нужен',m(165),m(39));
    ['Питомец может испугаться и убежать: переезд, поездка, гости, фейерверки.','Вы передаёте питомца другому человеку: передержка, ситтер, друзья, перевозка.','Вы гуляете там, где питомец раньше не бывал.','Просто на всякий случай, пока нет адресника.'].reduce((y,t)=>{c.beginPath();c.arc(m(168),m(y-1),m(1.3),0,7);c.fillStyle=C.ink;c.fill();c.fillStyle=C.ink;c.font=`500 ${m(3.5)}px ${FONT}`;const ls=wrap(c,t,m(106));ls.forEach((l,j)=>c.fillText(l,m(172),m(y+j*4.6)));return y+ls.length*4.6+5},49);
    rr(c,m(155),m(112),m(130),m(78),m(7));c.fillStyle=C.ink;c.fill();c.fillStyle=C.white;c.font=`800 ${m(5.2)}px ${FONT}`;c.fillText('Важно знать',m(165),m(125));
    ['Это временная мера. Она не заменяет адресник и чип.','Телефон на ошейнике виден любому. Если не хотите, напечатайте без него: QR сработает и так.','В QR записан только короткий код. Имя, телефон и адрес в нём не хранятся.'].reduce((y,t)=>{c.beginPath();c.arc(m(168),m(y-1),m(1.3),0,7);c.fillStyle=C.lime;c.fill();c.fillStyle=C.white;c.font=`500 ${m(3.5)}px ${FONT}`;const ls=wrap(c,t,m(106));ls.forEach((l,j)=>c.fillText(l,m(172),m(y+j*4.6)));return y+ls.length*4.6+5},135);
    c.fillStyle=C.gray;c.font=`500 ${m(3.2)}px ${FONT}`;c.fillText('Подробнее: статья «Бумажный ошейник» в разделе «Самопомощь».',m(12),m(200));
    return cv;
  }
  const blobOf=cv=>new Promise(r=>cv.toBlob(r,'image/jpeg',.92));
  async function buildPdf(cvs){
    const enc=new TextEncoder(),parts=[],offs=[];let pos=0;
    const push=b=>{const u=typeof b==='string'?enc.encode(b):b;parts.push(u);pos+=u.length};
    const n=cvs.length,W=841.89,H=595.28;
    push('%PDF-1.4\n');
    offs[1]=pos;push('1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n');
    offs[2]=pos;push(`2 0 obj\n<</Type/Pages/Count ${n}/Kids[${cvs.map((_,i)=>`${3+i*3} 0 R`).join(' ')}]>>\nendobj\n`);
    for(let i=0;i<n;i++){
      const pg=3+i*3,ct=4+i*3,im=5+i*3,jpg=new Uint8Array(await (await blobOf(cvs[i])).arrayBuffer());
      offs[pg]=pos;push(`${pg} 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Resources<</XObject<</Im0 ${im} 0 R>>>>/Contents ${ct} 0 R>>\nendobj\n`);
      const s=`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;offs[ct]=pos;push(`${ct} 0 obj\n<</Length ${s.length}>>\nstream\n${s}\nendstream\nendobj\n`);
      offs[im]=pos;push(`${im} 0 obj\n<</Type/XObject/Subtype/Image/Width ${cvs[i].width}/Height ${cvs[i].height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpg.length}>>\nstream\n`);push(jpg);push('\nendstream\nendobj\n');
    }
    const total=3+n*3,xr=pos;let x=`xref\n0 ${total}\n0000000000 65535 f \n`;for(let i=1;i<total;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
    push(x+`trailer\n<</Size ${total}/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`);
    const out=new Uint8Array(pos);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out;
  }
  async function makePdf(o={}){const cs=CS(),opt={phone:o.phone??cs.phone,len:LEN[o.size||cs.size],example:!!o.example};const scout=await loadImg('assets/scout-happy.png');return buildPdf([page1(opt,scout),page2(opt)])}
  async function previewUrl(){const cs=CS(),L=LEN[cs.size],k=5,cv=document.createElement('canvas');cv.width=Math.round((L+4)*k);cv.height=Math.round(42*k);const c=cv.getContext('2d');c.fillStyle='rgba(0,0,0,0)';const scout=await loadImg('assets/scout-happy.png');drawStrip(c,k,2,2,{phone:cs.phone,len:L,scout});return cv.toDataURL('image/png')}
  window.podhvat.collar={makePdf,drawStrip,previewUrl,LEN};

  /* экран */
  if(!SCREEN_REGISTRY.some(s=>s[0]==='pet-collar'))SCREEN_REGISTRY.push(['pet-collar','Напечатать ошейник','Print a collar','Профиль','PDF с макетами бумажного ошейника: имя питомца, контакты и QR-код. На случай побега или передачи питомца.']);
  V['pet-collar']=()=>{const cs=CS(),p=state.profile||{},hasPhone=!!String(p.contact||'').trim();
    return `<h1>${L('Напечатать ошейник','Print a collar')}</h1>
<p class="collar-lead">${L('Готовые макеты бумажного ошейника в стиле Подхвата: имя питомца, телефон и QR-код. Напечатайте и наденьте на всякий случай.','Ready-made paper collar layouts in Podhvat style: pet name, phone and a QR code. Print one and put it on, just in case.')}</p>
<section class="card collar-why"><h3>${L('Когда он пригодится','When it helps')}</h3><ul><li>${L('Питомец может испугаться и убежать: переезд, поездка, гости, фейерверки.','Your pet may get scared and run away: moving, a trip, guests, fireworks.')}</li><li>${L('Вы передаёте питомца другому человеку: передержка, ситтер, друзья, перевозка.','You hand your pet over to someone: foster, sitter, friends, transport.')}</li></ul></section>
<section class="collar-prev" aria-label="${L('Предпросмотр полосы ошейника','Collar strip preview')}" tabindex="0"><img id="collar-prev-img" alt="${L('Полоса ошейника: имя, телефон и QR','Collar strip: name, phone and QR')}" width="1195" height="210"></section>
<small class="collar-hint">${L('Листайте полосу вбок. В PDF четыре таких полосы и страница с инструкцией.','Scroll the strip sideways. The PDF has four such strips and an instruction page.')}</small>
<section class="card collar-opts"><h3>${L('Что напечатать','What to print')}</h3>
<div class="seg" role="radiogroup" aria-label="${L('Размер','Size')}">${[['cat',L('Кошка · шея до 21 см','Cat · neck up to 21 cm')],['dog',L('Собака · шея до 25 см','Dog · neck up to 25 cm')]].map(([v,t])=>`<button type="button" role="radio" aria-checked="${v===cs.size}" class="${v===cs.size?'active':''}" data-collar="size:${v}">${t}</button>`).join('')}</div>
<label class="preference-row"><span>${L('Телефон на ошейнике','Phone on the collar')}<small>${hasPhone?L('Его увидит любой, кто найдёт питомца. Без телефона сработает QR.','Anyone who finds the pet will see it. Without it, the QR still works.'):L('Добавьте телефон в личных данных профиля, и он появится на ошейнике.','Add a phone number in your profile and it will appear on the collar.')}</small></span><input type="checkbox" role="switch" data-collar-toggle="phone" ${cs.phone&&hasPhone?'checked':''} ${hasPhone?'':'disabled'}></label>
</section>
<button class="button" data-collar="pdf">${I('download')}${L('Скачать PDF','Download PDF')}</button>
<a class="button secondary" href="assets/collar/podhvat-collar-example.pdf" target="_blank" rel="noopener">${L('Открыть пример PDF','Open example PDF')}</a>
<button class="button secondary" data-help-article="collar">${L('Прочитать статью','Read the article')}</button>
<aside class="help-caution">${I('shield')}<p>${L('Бумажный ошейник — временная мера. Он не заменяет адресник и чип. В QR записан только короткий код, а не ваши данные.','A paper collar is a temporary measure. It does not replace an ID tag or a chip. The QR holds only a short code, not your data.')}</p></aside>`};
  const bPetAfter=V.profile;
  V.profile=()=>bPetAfter()+`<button class="card card-link collar-entry" data-go="pet-collar"><span class="collar-ico" aria-hidden="true">${I('download')}</span><span class="collar-entry-copy"><b>${L('Напечатать ошейник','Print a collar')}</b><small>${L('PDF с контактами и QR на случай побега или передачи питомца','A PDF with contacts and a QR in case your pet runs away or is handed over')}</small></span><span class="collar-arrow" aria-hidden="true">${I('arrow')}</span></button>`;
  const rBefore=render;
  render=function(...a){const r=rBefore.apply(this,a);if(screen==='pet-collar'){previewUrl().then(u=>{const i=app.querySelector('#collar-prev-img');if(i)i.src=u}).catch(()=>{})}return r};
  window.addEventListener('click',async ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-collar]');if(!b)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const [k,v]=b.dataset.collar.split(':'),cs=CS();
    if(k==='size'){cs.size=v;persist();render();return}
    if(k==='pdf'){
      toast(L('Готовлю PDF…','Preparing the PDF…'));
      try{const bytes=await makePdf(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download='podhvat-collar.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);toast(L('PDF готов','PDF is ready'))}
      catch(err){toast(L('Не удалось подготовить PDF','Could not prepare the PDF'))}
    }
  },true);
  window.addEventListener('change',ev=>{const t=ev.target;if(!t.matches||!t.matches('[data-collar-toggle]'))return;const cs=CS();cs.phone=t.checked;persist();render()},true);

  /* ---------- 3. статья ---------- */
  if(typeof SELF_HELP!=='undefined'&&!SELF_HELP.some(a=>a.id==='collar'))SELF_HELP.push({id:'collar',title:'Бумажный ошейник: когда и как',tag:'Заранее',icon:'shield',tone:'lime',cover:'assets/cat.png',time:2,
    lead:'Если питомец убежит или вы передаёте его другому человеку, нашедший сразу поймёт, как с вами связаться.',
    steps:[['Решите, когда он нужен','Надевайте на всякий случай, если питомец может испугаться и убежать (переезд, поездка, гости, фейерверки) или если вы передаёте его другому человеку: на передержку, ситтеру, друзьям.'],['Напечатайте и соберите','Профиль → «Напечатать ошейник» → «Скачать PDF». A4, масштаб 100%, плотная бумага. Вырежьте по пунктиру, заклейте скотчем или заламинируйте и склейте на нахлёсте: под ошейник должны проходить два пальца.'],['Проверяйте каждый день','Бумага мнётся и мокнет. Если QR или текст стёрлись, замените полосу. Ошейник не для постоянной носки: снимайте, если он мешает или натирает.']],
    match:/ошейник|бирк|куар|qr|побег|сбеж|убеж/i,note:'Телефон на бумажном ошейнике виден всем. Если не хотите, напечатайте без него: QR сработает и так. Это временная мера, она не заменяет адресник и чип.'});

  /* ---------- 4. английский для новых текстов ---------- */
  const DICT=window.podhvat&&window.podhvat.i18n&&window.podhvat.i18n.dictionary;
  if(DICT)Object.assign(DICT,{
    'Бумажный ошейник: когда и как':'Paper collar: when and how','Заранее':'In advance',
    'Если питомец убежит или вы передаёте его другому человеку, нашедший сразу поймёт, как с вами связаться.':'If your pet runs away or you hand it to someone else, whoever finds it will know at once how to reach you.',
    'Решите, когда он нужен':'Decide when you need it',
    'Надевайте на всякий случай, если питомец может испугаться и убежать (переезд, поездка, гости, фейерверки) или если вы передаёте его другому человеку: на передержку, ситтеру, друзьям.':'Put it on just in case your pet may get scared and run away (moving, a trip, guests, fireworks) or when you hand it over to someone: a foster, a sitter, friends.',
    'Напечатайте и соберите':'Print and assemble',
    'Профиль → «Напечатать ошейник» → «Скачать PDF». A4, масштаб 100%, плотная бумага. Вырежьте по пунктиру, заклейте скотчем или заламинируйте и склейте на нахлёсте: под ошейник должны проходить два пальца.':'Profile → “Print a collar” → “Download PDF”. A4, 100% scale, heavy paper. Cut along the dashed line, cover with tape or laminate, and join on the overlap so two fingers fit under the collar.',
    'Проверяйте каждый день':'Check every day',
    'Бумага мнётся и мокнет. Если QR или текст стёрлись, замените полосу. Ошейник не для постоянной носки: снимайте, если он мешает или натирает.':'Paper creases and gets wet. If the QR or text wears off, replace the strip. It is not for constant wear: take it off if it bothers or chafes.',
    'Телефон на бумажном ошейнике виден всем. Если не хотите, напечатайте без него: QR сработает и так. Это временная мера, она не заменяет адресник и чип.':'The phone number on a paper collar is visible to everyone. If you prefer, print without it: the QR works anyway. It is a temporary measure and does not replace an ID tag or a chip.'
  });
})();
