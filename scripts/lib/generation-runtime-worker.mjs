// Only pure disposable-fixture modules are supplied by the verification runner.
// This process receives no app credentials and has no real device adapters.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
try {
  const { modules, dependencies, tests } = JSON.parse(readFileSync(0, 'utf8'));
  const factories = Object.entries(modules).map(([id, code]) =>
    `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`).join(',\n');
  const source = `"use strict";
    const factories={${factories}}, dependencies=${JSON.stringify(dependencies)}, cache=Object.create(null);
    const React={createElement(type,props,...children){return {type,props:{...props,children:children.length?children:props?.children}};},Fragment:'fragment'};
    function load(id){
      if(id==='react') return {__esModule:true,default:React,...React};
      if(cache[id])return cache[id].exports;
      if(!factories[id])throw Error('Module outside fixture: '+id);
      const module={exports:{}};cache[id]=module;
      factories[id](module,module.exports,name=>{const target=dependencies[id]?.[name];if(!target)throw Error('Unapproved dependency: '+name);return load(target);});
      return module.exports;
    }
    function assert(ok,label){if(!ok)throw Error(label);}
    function throws(fn,label){let did=false;try{fn();}catch{did=true;}assert(did,label);}
    function renderText(value){if(value===null||value===undefined||typeof value==='boolean')return '';if(Array.isArray(value))return value.map(renderText).join('');
      if(typeof value==='object')return typeof value.type==='function'?renderText(value.type(value.props)):renderText(value.props?.children);return String(value);}
    ${tests}
    true;`;
  new vm.Script(source, { filename: 'generated-fixture-verification.js' }).runInContext(
    vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } }), { timeout: 1500 });
  process.stdout.write(JSON.stringify({ ok: true }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
