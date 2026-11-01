import { useEffect, useRef, useState } from 'react';

function sampleWav() {
  const rate = 22050, duration = 8, count = rate * duration;
  const bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * 2, true);
  const notes = [261.63, 329.63, 392, 523.25, 440, 349.23, 293.66, 392];
  for (let index = 0; index < count; index++) {
    const time = index / rate, part = time % 0.5, envelope = Math.min(1, part / 0.02) * Math.max(0, 1 - part / 0.5);
    const sound = Math.sin(2 * Math.PI * notes[Math.floor(time / 0.5) % notes.length] * time) * envelope * 0.2;
    view.setInt16(44 + index * 2, sound * 32767, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
export default function AZMusicPlayer({ accountId, action = 'play' }: { accountId: string; action?: string }) {
  const audio = useRef<HTMLAudioElement>(null), input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(''), [name, setName] = useState(''), [error, setError] = useState('');
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => { if (action === 'stop') { audio.current?.pause(); window.dispatchEvent(new Event('az-stop-music')); } }, [action]);
  useEffect(() => { const stop = () => audio.current?.pause(); window.addEventListener('az-stop-music', stop); return () => window.removeEventListener('az-stop-music', stop); }, []);
  useEffect(() => { setSource(''); setName(''); }, [accountId]);
  const select = (blob: Blob, title: string) => { window.dispatchEvent(new Event('az-stop-music')); setError(''); setSource(URL.createObjectURL(blob)); setName(title); };
  if (action === 'stop') return null;
  return <div className="mt-2 space-y-2 rounded border bg-white p-2 text-black">
    <p className="text-xs">PC内の音楽を再生します。選択したファイルはサーバーへ送信しません。</p>
    <input ref={input} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" className="hidden" onChange={event => {
      const file = event.target.files?.[0]; if (file) { if (file.size > 100 * 1024 * 1024) setError('100MB以下の音楽ファイルを選んでください。'); else select(file, file.name); } event.target.value = '';
    }} />
    <button type="button" className="mr-3 text-blue-700 underline" onClick={() => input.current?.click()}>音楽ファイルを選ぶ</button>
    <button type="button" className="text-blue-700 underline" onClick={() => select(sampleWav(), 'PoiPoiサンプル')}>サンプルを再生</button>
    {source && <><p className="break-all text-xs">{name}</p><audio ref={audio} src={source} controls autoPlay preload="metadata" className="w-full" onError={() => setError('このファイルを再生できません。MP3またはWAVを選んでください。')} /></>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
