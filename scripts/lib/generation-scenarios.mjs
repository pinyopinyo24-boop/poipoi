// Acceptance contracts for disposable fixtures. These are never model answers.
export const scenarios = [
  {
    id: 'unicode', title: '新規関数・日本語と絵文字',
    request: '文字数を数える独立した関数をserver/core/CharacterCount.tsに新規作成して。countCharacters(input:string):numberをexportする。Unicodeコードポイントで数え、空欄は0文字、「あいう」は3文字、「😀」は1文字にする。参考はserver/core/Reference.tsだけ。既存ファイルは変更しないで。',
    required: ['server/core/CharacterCount.ts'],
    tests: `const {countCharacters:f}=load('server/core/CharacterCount.ts');
      assert(typeof f==='function','required named export countCharacters must be callable');
      for(const [input,n] of [['',0],['あいう',3],['😀',1],['a😀い',3],['𠮷野家',3],['abc',3],['é',2],['👨‍👩‍👧‍👦',7],['   ',3]]) assert(f(input)===n,'character count '+JSON.stringify(input));`,
  },
  {
    id: 'weighted-average', title: '入力検証・加重平均',
    request: '製造実績から1個当たりの平均時間を計算する独立した関数をserver/core/ProductionAverage.tsに新規作成して。averageMinutes(rows:{quantity:number,minutes:number}[]):numberをexportする。合計minutesを合計quantityで割る加重平均にする。空配列、有限でない数、0以下の数量、負の時間はエラーにして。時間0は有効。参考はserver/core/Reference.tsだけで、既存ファイルは保持して。',
    required: ['server/core/ProductionAverage.ts'],
    tests: `const {averageMinutes:f}=load('server/core/ProductionAverage.ts');
      assert(typeof f==='function','required named export averageMinutes must be callable');
      assert(Math.abs(f([{quantity:40,minutes:127},{quantity:12,minutes:60},{quantity:43,minutes:270},{quantity:50,minutes:155}])-612/145)<1e-10,'weighted average');
      assert(f([{quantity:2,minutes:0}])===0,'zero minutes');
      assert(f([{quantity:0.5,minutes:1}])===2,'positive fractional quantity');
      for(const rows of [[],[{quantity:0,minutes:1}],[{quantity:-1,minutes:1}],[{quantity:1,minutes:-1}],[{quantity:NaN,minutes:1}],[{quantity:Infinity,minutes:1}],[{quantity:1,minutes:NaN}],[{quantity:1,minutes:Infinity}],[{quantity:1,minutes:1},{quantity:1,minutes:-1}]]) throws(()=>f(rows),'invalid rows');`,
  },
  {
    id: 'duplicate-registration', title: '部品登録・重複防止と既存データ保持',
    request: '部品の品番と名前を登録する独立した処理をserver/core/PartRegistry.tsに新規作成して。registerPart(parts:{sku:string,name:string}[],part:{sku:string,name:string})をexportする。元の配列と入力オブジェクトは変更せず、既存部品と追加部品を含む新しい配列を返して。品番は前後空白を除いて大文字にそろえて比較し、重複や空の品番、空の名前はエラーにする。追加部品は品番を空白除去・大文字化し名前も前後空白を除いて保存する。参考はserver/core/Reference.tsだけ。',
    required: ['server/core/PartRegistry.ts'],
    tests: `const {registerPart:f}=load('server/core/PartRegistry.ts');
      assert(typeof f==='function','required named export registerPart must be callable');
      const rows=[{sku:' A1 ',name:'Old'}], part={sku:' b2 ',name:' New '}; const before=JSON.stringify([rows,part]);
      const result=f(rows,part); assert(result!==rows && result.length===2,'new array');
      assert(result[0].sku===' A1 ' && result[0].name==='Old','preserve existing records');
      assert(result[1].sku==='B2' && result[1].name==='New','normalize new record');
      assert(JSON.stringify([rows,part])===before,'do not mutate inputs');
      throws(()=>f(rows,{sku:'a1',name:'Duplicate'}),'duplicate SKU');
      throws(()=>f(result,{sku:' b2 ',name:'Duplicate'}),'new record is also protected');
      throws(()=>f([{sku:'X',name:'X'},{sku:'Y',name:'Y'}],{sku:' y ',name:'Duplicate'}),'check all existing rows');
      assert(f([],{sku:' d4 ',name:'First'})[0].sku==='D4','first registration');
      throws(()=>f(rows,{sku:' ',name:'Name'}),'blank SKU'); throws(()=>f(rows,{sku:'C3',name:' '}),'blank name');`,
  },
  {
    id: 'large-existing-edit', title: '大きな既存ファイルの差分修正',
    files: { 'server/core/LargeExisting.ts': 'export function total(price: number, quantity: number) { return price + quantity; }\n' + '// Unrelated existing behavior must remain unchanged.\n'.repeat(500) },
    request: 'Modify server/core/LargeExisting.ts: change ONLY the expression price + quantity to price * quantity in total. Preserve every other character, comment and line. Return an unapplied proposal.',
    required: ['server/core/LargeExisting.ts'], preserveExact: true,
    tests: `const {total:f}=load('server/core/LargeExisting.ts'); assert(typeof f==='function','required named export total must be callable'); assert(f(3,4)===12,'multiplication'); assert(f(0,8)===0,'zero');`,
  },
  {
    id: 'multiple-modules', title: '複数ファイルのimport・公開API連携',
    request: 'Create NEW standalone modules server/core/PriceMath.ts exporting lineTotal(price:number,quantity:number):number and server/core/Invoice.ts exporting invoiceTotal(rows:{price:number,quantity:number}[]):number. Invoice MUST import and call lineTotal from ./PriceMath. Sum price * quantity for all rows; empty rows returns 0. Reference server/core/Reference.ts only. Preserve existing files.',
    required: ['server/core/PriceMath.ts','server/core/Invoice.ts'],
    tests: `const math=load('server/core/PriceMath.ts'), original=math.lineTotal; let calls=0;
      assert(typeof original==='function','required named export lineTotal must be callable');
      math.lineTotal=(...args)=>{calls++;return original(...args);};
      const {invoiceTotal:f}=load('server/core/Invoice.ts'); assert(typeof f==='function','required named export invoiceTotal must be callable'); assert(f([])===0,'empty invoice');
      assert(f([{price:127,quantity:17},{price:139,quantity:2}])===2437,'invoice total');
      assert(calls===2,'invoice must call the imported helper for both rows');
      assert(load('server/core/PriceMath.ts').lineTotal(7,3)===21,'public helper');
      assert(f([{price:2.5,quantity:4},{price:0,quantity:5}])===10,'fractional price and zero');`,
    imports: { 'server/core/Invoice.ts': './PriceMath' },
  },
  {
    id: 'react-display', title: 'React表示部品・入力更新',
    request: 'Create client/src/components/CharacterCount.tsx as a NEW standalone React display component with default export CharacterCount({input}:{input:string}). Render an output element whose only text is the Unicode code point count followed by 文字. Empty is 0文字, あいう is 3文字, 😀 is 1文字. Do not hard-code these samples. Do not modify or mount into any parent. Reference server/core/Reference.ts only.',
    required: ['client/src/components/CharacterCount.tsx'],
    tests: `const C=load('client/src/components/CharacterCount.tsx').default;
      assert(typeof C==='function','required default export CharacterCount must be callable');
      for(const [input,text] of [['','0文字'],['あいう','3文字'],['😀','1文字'],['a😀い','3文字']]) {
        const view=C({input}); assert(isReactElement(view),'real React element'); assert(view && view.type==='output','output element'); assert(renderText(view)===text,'render updated input '+input);
      }`,
  },
  {
    id: 'transfer-workflow', title: '読み取り→入れ替え案内→書き込み→照合',
    request: 'Create NEW standalone server/core/TransferFlow.ts exporting createTransferFlow(adapter). Adapter has synchronous read():string, write(snapshot:string):void, verify(snapshot:string):boolean. No actual hardware or filesystem access. Return {start(), confirmTarget(), getState()}. getState returns {phase,message}; initial phase idle. start calls read once, stores its snapshot, and enters awaiting-target with a nonempty message asking the user to replace source media with target media; NEVER write before confirmTarget. start outside idle and confirmTarget outside awaiting-target must throw without resetting the existing state or performing device operations. After confirmation call write then verify using the SAME saved snapshot; true enters done, false enters error with a nonempty message. Catch read/write/verify errors and enter error with a message including the caught error message; never execute subsequent device steps after failure. Reference server/core/Reference.ts only.',
    required: ['server/core/TransferFlow.ts'],
    tests: `const {createTransferFlow:f}=load('server/core/TransferFlow.ts');
      assert(typeof f==='function','required named export createTransferFlow must be callable');
      const log=[]; let readable=true;
      const flow=f({read(){assert(readable,'cannot read removed source');log.push('read');return 'saved-source';},write(s){assert(!readable,'source media already removed');log.push('write:'+s);},verify(s){log.push('verify:'+s);return true;}});
      assert(flow.getState().phase==='idle','initial idle'); flow.start();
      assert(JSON.stringify(log)==='["read"]','no write before confirmation');
      assert(flow.getState().phase==='awaiting-target' && flow.getState().message.trim(),'swap guidance');
      assert(/replace|swap|insert|入れ替|入替|交換|挿入/i.test(flow.getState().message),'message must actually guide media exchange');
      throws(()=>flow.start(),'reject duplicate start'); assert(flow.getState().phase==='awaiting-target','preserve waiting state');
      readable=false; flow.confirmTarget(); assert(flow.getState().phase==='done','complete after verification');
      throws(()=>flow.confirmTarget(),'reject duplicate write'); assert(flow.getState().phase==='done','preserve done state');
      assert(JSON.stringify(log)==='["read","write:saved-source","verify:saved-source"]','ordered operations with stored snapshot');
      const premature=[];throws(()=>f({read(){premature.push('read');return '';},write(){premature.push('write');},verify(){premature.push('verify');return true;}}).confirmTarget(),'confirmation before start');
      assert(premature.length===0,'no device operations before start');
      const mismatch=f({read:()=> 'image',write(){},verify:()=>false}); mismatch.start(); mismatch.confirmTarget();
      assert(mismatch.getState().phase==='error' && mismatch.getState().message.trim(),'verification mismatch');
      for(const broken of ['read','write','verify']) { const operations=[],adapter={};
        for(const operation of ['read','write','verify'])adapter[operation]=()=>{operations.push(operation);if(operation===broken)throw Error('device failure');return operation==='read'?'image':true;};
        const job=f(adapter); job.start(); if(broken!=='read') job.confirmTarget();
        assert(job.getState().phase==='error' && job.getState().message.includes('device failure'),'reported '+broken+' error');
        assert(JSON.stringify(operations)===JSON.stringify(['read','write','verify'].slice(0,['read','write','verify'].indexOf(broken)+1)),'stop operations after '+broken+' error'); }`,
  },
  {
    id: 'staged-ui-core', title: '段階生成・処理と画面の接続', staged: true,
    files: { 'client/src/pages/PartPreview.tsx': "import React from 'react';\nexport default function PartPreview({sku}: {sku:string}) { return <output>{sku}</output>; }\n" },
    request: 'shared/NormalizeSku.tsを新規作成し、normalizeSku(sku:string):stringをexportして前後の空白を除き大文字にする。参考はserver/core/Reference.ts。画面部品client/src/pages/PartPreview.tsxを変更し、normalizeSkuをimportしてinputのskuを正規化した結果だけをoutputに表示する。既存のdefault exportとpropsのskuは保持し、アプリへの適用やコミットはしない。',
    required: ['shared/NormalizeSku.ts','client/src/pages/PartPreview.tsx'],
    tests: `const core=load('shared/NormalizeSku.ts'), f=core.normalizeSku; assert(typeof f==='function','required named export normalizeSku must be callable'); assert(f(' a-1 ')==='A-1','core normalization');
      let calls=0;core.normalizeSku=(...args)=>{calls++;return f(...args);};
      const C=load('client/src/pages/PartPreview.tsx').default;
      const first=C({sku:' a-1 '}),second=C({sku:' b2 '});
      assert(isReactElement(first) && isReactElement(second),'real React elements');
      assert(renderText(first)==='A-1','UI connected to generated core');
      assert(renderText(second)==='B2','UI updates for different props');
      assert(calls===2,'UI must actually call the generated core');`,
    imports: { 'client/src/pages/PartPreview.tsx': 'NormalizeSku' },
  },
];

export function initialFiles(scenario) {
  return { 'server/core/Reference.ts': 'export const reference = true;\n', ...scenario.files };
}
