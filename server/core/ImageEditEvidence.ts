/** Pixel measurements are evidence of change, never proof of semantic quality. */
export type RegionChangeEvidence = { label: string; editablePixels: number; changedPixels: number; changedFraction: number;
  foregroundPixels: number; changedForegroundPixels: number; foregroundExpansionPixels: number; foregroundChangedFraction?: number };
export type ImageChangeEvidence = { backgroundEstimated: boolean; regions: RegionChangeEvidence[]; sufficientChange: boolean };
export function measureImageChange(source: Buffer, output: Buffer, mask: Buffer, width: number, height: number,
  regions: Array<{ label: string; box: [number, number, number, number] }>): ImageChangeEvidence {
  if (source.length !== width*height*4 || output.length !== source.length || mask.length !== width*height) throw new Error('画像比較データの寸法が一致しません。');
  const border: number[][] = [];
  for (let x=0; x<width; x+=Math.max(1,Math.floor(width/128))) for (const y of [0,height-1]) border.push([...source.subarray((y*width+x)*4,(y*width+x)*4+4)]);
  for (let y=0; y<height; y+=Math.max(1,Math.floor(height/128))) for (const x of [0,width-1]) border.push([...source.subarray((y*width+x)*4,(y*width+x)*4+4)]);
  const colors=new Map<string,{count:number;color:number[]}>();
  for(const color of border){const key=color.map(v=>Math.floor(v/16)).join(',');const entry=colors.get(key);if(entry)entry.count++;else colors.set(key,{count:1,color});}
  const dominant=[...colors.values()].sort((a,b)=>b.count-a.count)[0];
  const backgroundEstimated=Boolean(dominant && dominant.count>=border.length*.6);
  const isForeground=(offset:number)=>backgroundEstimated && source[offset+3]>32 && (dominant.color[3]<=32 || Math.abs(source[offset+3]-dominant.color[3])>24 ||
    Math.max(...[0,1,2].map(c=>Math.abs(source[offset+c]-dominant.color[c])))>36);
  const measured=regions.map(region=>{
    const [l,t,r,b]=region.box;
    const left=Math.max(0,Math.floor(l/1000*width)),right=Math.min(width,Math.ceil(r/1000*width));
    const top=Math.max(0,Math.floor(t/1000*height)),bottom=Math.min(height,Math.ceil(b/1000*height));
    let editablePixels=0,changedPixels=0,foregroundPixels=0,changedForegroundPixels=0;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const index=y*width+x,offset=index*4;if(mask[index]<=128)continue;editablePixels++;
      const changed=[0,1,2,3].reduce((sum,c)=>sum+Math.abs(source[offset+c]-output[offset+c]),0)>30;
      if(changed)changedPixels++;
      if(isForeground(offset)){foregroundPixels++;if(changed)changedForegroundPixels++;}
    }
    // Flat-color cartoons can grow muscles without changing the existing red
    // pixels. Count new, connected subject-colored pixels as shape-change evidence.
    // A blue background around a red subject does not qualify as subject growth.
    const palette=new Map<string,{count:number;color:number[]}>();
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const index=y*width+x,offset=index*4;if(mask[index]<=128||!isForeground(offset))continue;
      const color=[source[offset],source[offset+1],source[offset+2]];const key=color.map(v=>Math.floor(v/24)).join(',');
      const entry=palette.get(key);if(entry)entry.count++;else palette.set(key,{count:1,color});
    }
    const subjectColors=[...palette.values()].sort((a,b)=>b.count-a.count).filter(item=>item.count>=Math.max(2,foregroundPixels*.01)).slice(0,16);
    const connected=new Uint8Array(width*height),queue:number[]=[];
    const visit=(index:number)=>{
      const y=Math.floor(index/width),x=index%width,offset=index*4;
      if(x<left||x>=right||y<top||y>=bottom||connected[index]||mask[index]<=128||output[offset+3]<32)return;
      if(!subjectColors.some(item=>Math.max(...[0,1,2].map(c=>Math.abs(output[offset+c]-item.color[c])))<=48))return;
      connected[index]=1;queue.push(index);
    };
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(isForeground((y*width+x)*4))visit(y*width+x);
    for(let i=0;i<queue.length;i++){const index=queue[i],x=index%width;if(x>0)visit(index-1);if(x+1<width)visit(index+1);if(index>=width)visit(index-width);if(index+width<width*height)visit(index+width);}
    const foregroundExpansionPixels=queue.reduce((sum,index)=>sum+(isForeground(index*4)?0:1),0);
    return {label:region.label,editablePixels,changedPixels,changedFraction:editablePixels?changedPixels/editablePixels:0,
      foregroundPixels,changedForegroundPixels,foregroundExpansionPixels,foregroundChangedFraction:foregroundPixels?changedForegroundPixels/foregroundPixels:undefined};
  });
  // Background-only edits have no editable foreground. When a subject is inside
  // a region, changing only its surrounding white space must not pass the gate.
  const sufficientChange=measured.length>0 && measured.every(region=>region.editablePixels>=4 && region.changedPixels>=4 && region.changedFraction>=.03 &&
    (!backgroundEstimated || region.foregroundPixels<16 || ((region.changedForegroundPixels>=4 && (region.foregroundChangedFraction??0)>=.03) || region.foregroundExpansionPixels>=Math.max(4,region.foregroundPixels*.03))));
  return {backgroundEstimated,regions:measured,sufficientChange};
}
