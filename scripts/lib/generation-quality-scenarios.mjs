// Additional contracts, kept separate from the original eight-case baseline.
const existingFunction = 'export function batchCost(price: number, quantity: number): number { return price + quantity; }';
export const qualityScenarios = [
  {
    id: 'react-gauge', title: 'React別props・別要素・入力更新',
    request: 'Create client/src/components/Gauge.tsx as a NEW standalone React component with default export Gauge({value}:{value:number}). Return a meter element with min={0}, max={100}, and value clamped to [0,100]. Nonfinite values must render value 0. Derive the meter value from current value props every call. No input prop, output element, hooks or parent mounting. Reference server/core/Reference.ts only. Preserve existing files.',
    required: ['client/src/components/Gauge.tsx'],
    tests: `const C=load('client/src/components/Gauge.tsx').default;
      assert(typeof C==='function','required default export Gauge must be callable');
      for(const [value,expected] of [[-12,0],[0,0],[37.5,37.5],[100,100],[143,100],[NaN,0],[Infinity,0],[-Infinity,0],[0.25,0.25]]) {
        const view=C({value}); assert(isReactElement(view),'real React element'); assert(view && view.type==='meter','requested meter element: expected meter; actual '+String(view?.type));
        assert(view.props.min===0 && view.props.max===100,'meter bounds');
        assert(view.props.value===expected,'meter uses current value '+value);
      }`,
  },
  {
    id: 'inventory-adjustment', title: '在庫増減・有限値・不変性',
    request: 'Create NEW server/core/InventoryAdjustment.ts exporting adjustStock(stock:{sku:string,quantity:number},delta:number):{sku:string,quantity:number}. Return a NEW object preserving sku exactly and adding delta to quantity, leaving input unchanged. Require finite nonnegative original quantity, finite delta and finite nonnegative result. Throw for invalid inputs or underflow/overflow. Quantity 0, delta 0 and fractional quantities are valid. No filesystem or network. Reference server/core/Reference.ts only.',
    required: ['server/core/InventoryAdjustment.ts'],
    tests: `const {adjustStock:f}=load('server/core/InventoryAdjustment.ts');
      assert(typeof f==='function','required named export adjustStock must be callable');
      for(const [quantity,delta,expected] of [[0,0,0],[10,-3,7],[2.5,-0.5,2],[0,4,4],[8,-8,0]]) {
        const stock=Object.freeze({sku:' a-1 ',quantity}), next=f(stock,delta);
        assert(next!==stock && next.sku===' a-1 ' && next.quantity===expected,'new stock result');
        assert(stock.quantity===quantity,'preserve stock');
      }
      for(const [quantity,delta] of [[-1,2],[NaN,0],[Infinity,0],[2,NaN],[2,Infinity],[2,-Infinity],[2,-3],[Number.MAX_VALUE,Number.MAX_VALUE]])
        throws(()=>f({sku:'x',quantity},delta),'invalid stock adjustment');`,
  },
  {
    id: 'typed-quantity-result', title: '判別可能Union・空値・文字列形式検証',
    request: 'Create NEW server/core/QuantityResult.ts exporting parseQuantity(input:string): {ok:true,quantity:number}|{ok:false,error:string}. Trim surrounding whitespace; accept only one or more ASCII decimal digits and return their nonnegative safe integer value. Leading zeroes are valid. Reject empty text, signs, fractions, scientific notation, hex and unsafe integers with ok:false and a nonempty error. Invalid input must not throw. Reference server/core/Reference.ts only. Preserve existing files.',
    required: ['server/core/QuantityResult.ts'],
    tests: `const {parseQuantity:f}=load('server/core/QuantityResult.ts');
      assert(typeof f==='function','required named export parseQuantity must be callable');
      for(const [input,expected] of [['0',0],[' 17 ',17],['007',7],['9007199254740991',Number.MAX_SAFE_INTEGER]]) {
        const result=f(input); assert(result.ok===true && result.quantity===expected,'valid quantity '+input);
      }
      for(const input of ['', ' ', '-1', '+1', '1.5', '1e3', '0x10', '１２', '12x', '9007199254740992']) {
        const result=f(input); assert(result.ok===false && typeof result.error==='string' && result.error.trim(),'invalid quantity '+input);
      }`,
  },
  {
    id: 'existing-business-validation', title: '既存業務処理・入力検証・周辺ソース保全',
    files: {'server/core/BatchCost.ts': '// Existing public API and comments must survive.\nexport const currency = "JPY";\n' + existingFunction + '\n' + '// Unrelated production behavior stays unchanged.\n'.repeat(300) + 'export function label() { return currency; }\n'},
    request: 'Modify ONLY the batchCost function in server/core/BatchCost.ts. Return price * quantity. Reject nonfinite price or quantity, negative price, quantity <= 0 and nonfinite result with an Error. Price 0 and positive fractional quantity are valid. Preserve its name, parameter types, return type, and EVERY character outside that function (including unrelated comments, currency and label). Return an unapplied proposal.',
    required: ['server/core/BatchCost.ts'],
    editableRegion: {file:'server/core/BatchCost.ts',oldText:existingFunction},
    tests: `const {batchCost:f,label,currency}=load('server/core/BatchCost.ts');
      assert(typeof f==='function','required named export batchCost must be callable');
      assert(f(7,3)===21 && f(0,2)===0 && f(2.5,0.5)===1.25,'batch cost calculation');
      assert(currency==='JPY' && label()==='JPY','preserve other exports');
      for(const [price,quantity] of [[-1,2],[2,0],[2,-1],[NaN,2],[Infinity,2],[2,NaN],[2,Infinity],[Number.MAX_VALUE,2]])
        throws(()=>f(price,quantity),'invalid batch cost');`,
  },
];
