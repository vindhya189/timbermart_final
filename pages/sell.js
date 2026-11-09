import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function SellTimber(){
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [form,setForm]=useState({ species:'Teak Wood - Sagwan', quantity_value:'20', quantity_type:'CFT', price_value:'750', price_type:'CFT', girth:'60cm+', length:'6FT to 12FT', location_village:'Anakapalle', location_mandal:'Anakapalle Mandal', location_district:'Anakapalle', location_state:'Andhra Pradesh', full_address:'Anakapalle, Anakapalle Mandal, Anakapalle District, Andhra Pradesh', gps:'17.6814, 83.0171', contact_phone:'', contact_name:'', description:'' });
  const [files,setFiles]=useState([]); const [previews,setPreviews]=useState([]); const [uploading,setUploading]=useState(false); const [showSuccess,setShowSuccess]=useState(false); const [newId,setNewId]=useState(''); const [dragOver,setDragOver]=useState(false); const [uploadProgress,setUploadProgress]=useState(0);

  const handleFiles = (inputFiles) => {
    const arr = Array.from(inputFiles);
    if(arr.length + files.length > 5){ alert(`Max 5 photos only`); return; }
    const valid = arr.filter(f=>f.type.startsWith('image/'));
    if(valid.length===0){ alert('Select valid images'); return; }
    setFiles(p=>[...p, ...valid]); setPreviews(p=>[...p, ...valid.map(f=>URL.createObjectURL(f))]);
  };
  const onFileInput = (e) => { handleFiles(e.target.files); if(fileInputRef.current) fileInputRef.current.value=''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const removeFile = (idx) => { setFiles(f=>f.filter((_,i)=>i!==idx)); setPreviews(p=>{ try{ URL.revokeObjectURL(p[idx]); }catch(e){} return p.filter((_,i)=>i!==idx); }); };

  const createListing = async () => {
    if(!form.contact_phone || form.contact_phone.length<10){ alert('Valid WhatsApp number'); return; }
    if(files.length===0){ alert('Upload at least 1 photo - Fixes TM-809352 0/0'); return; }
    setUploading(true); setUploadProgress(10);
    const listing_id = `TM-${Math.floor(100000 + Math.random()*900000)}`;
    setNewId(listing_id);
    console.log('Starting upload for', listing_id, files.length);
    try{
      setUploadProgress(20);
      const { error: listErr } = await supabase.from('listings').insert({
        listing_id, species:form.species, quantity_value:form.quantity_value, quantity_type:form.quantity_type,
        price_value:form.price_value, price_type:form.price_type, girth:form.girth, length:form.length,
        location_village:form.location_village, location_mandal:form.location_mandal, location_district:form.location_district,
        location_state:form.location_state, full_address:form.full_address, gps:form.gps, contact_phone:form.contact_phone,
        ai_summary:`${form.species} ${form.girth} ${form.quantity_value} ${form.quantity_type} at ${form.location_village} | GPS:${form.gps}`, 
        status:'pending', created_at:new Date().toISOString()
      });
      if(listErr) throw listErr;
      console.log('Listing inserted', listing_id);
      setUploadProgress(40);
      for(let i=0;i<files.length;i++){
        const file=files[i];
        const cleanName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const fileName=`${listing_id}/${Date.now()}_${i}_${cleanName}`;
        console.log('Uploading', fileName, 'to timber-images');
        let bucket='timber-images';
        let { error: upErr, data: upData } = await supabase.storage.from(bucket).upload(fileName, file, { upsert:true, contentType:file.type });
        console.log('Upload result', bucket, upErr, upData);
        if(upErr){
          console.log('Trying listing-images bucket');
          bucket='listing-images';
          const { error: e2, data: d2 } = await supabase.storage.from(bucket).upload(fileName, file, { upsert:true, contentType:file.type });
          console.log('Second bucket result', e2, d2);
          if(e2) throw e2;
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
        console.log('Public URL', pub.publicUrl);
        const { error: imgErr } = await supabase.from('listing_images').insert({ listing_id, image_url:pub.publicUrl });
        console.log('Image insert result', imgErr);
        if(imgErr) throw imgErr;
        setUploadProgress(40 + Math.floor(((i+1)/files.length)*50));
      }
      setUploadProgress(100); setUploading(false); setShowSuccess(true);
      const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js'; document.body.appendChild(s);
      s.onload=()=>{ const end=Date.now()+3500; (function frame(){ window.confetti({particleCount:4,angle:60,spread:60,origin:{x:0}}); window.confetti({particleCount:4,angle:120,spread:60,origin:{x:1}}); if(Date.now()<end) requestAnimationFrame(frame); })(); };
    }catch(e){ setUploading(false); alert('Upload failed: '+e.message+' - SQL policy run cheyandi Step 1'); console.error(e); }
  };

  return(
    <div className="min-h-screen bg-white max-w-[480px] mx-auto pb-10">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div><h1 className="text-[20px] font-extrabold">Sell Your Timber Lot 🪵</h1><p className="text-[11px] text-zinc-500 mt-1">Upload clear photos - Admin verifies - Live - FIXED TM-809352</p></div>
          <button onClick={()=>router.push('/admin')} className="text-[10px] border px-3 py-1.5 rounded-full font-bold">Admin</button>
        </div>
        <div className="mt-6">
          <p className="text-[12px] font-bold">📸 Timber Photos * (1-5) - First is COVER - Fixes TM-809352 0/0</p>
          <div onDragOver={e=>{e.preventDefault(); setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop} className={`mt-3 border-2 border-dashed rounded-[20px] p-4 ${dragOver?'border-black bg-zinc-50':'border-zinc-300 bg-[#fafafa]'}`}>
            <div className="grid grid-cols-3 gap-3">
              {previews.map((src,i)=>(
                <div key={i} className="relative h-[100px] rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button onClick={()=>removeFile(i)} className="absolute top-1 right-1 w-6 h-6 bg-black/80 text-white rounded-full text-[11px]">✕</button>
                  {i===0 && <span className="absolute bottom-1 left-1 bg-black text-white text-[8px] px-2 py-0.5 rounded-full font-bold">COVER</span>}
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1.5 rounded-full">{i+1}</span>
                </div>
              ))}
              {previews.length<5 && (
                <label className="h-[100px] rounded-2xl border-2 border-dashed border-zinc-300 bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50">
                  <span className="text-[28px]">+</span><span className="text-[10px] font-bold">Add Photo</span><span className="text-[9px] text-zinc-400">{5-previews.length} left</span>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onFileInput} className="hidden" />
                </label>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-3">Drag & drop • {files.length}/5 • Fixes TM-809352</p>
            {uploading && (<div className="mt-3"><div className="h-2 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-black" style={{width:`${uploadProgress}%`}}></div></div><p className="text-[10px] text-center mt-1">{uploadProgress}% uploading to Supabase - SQL run cheyandi Step 1</p></div>)}
          </div>
          {files.length>0 ? <p className="text-[11px] text-green-600 font-bold mt-2">✅ {files.length} photos ready - Will show {files.length}/{files.length} - Perfect fetch</p> : <p className="text-[11px] text-red-500 font-bold mt-2">❌ No photos - TM-809352 had this - Add 1</p>}
        </div>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><p className="text-[11px] font-bold">Species *</p><input value={form.species} onChange={e=>setForm({...form, species:e.target.value})} className="w-full border rounded-full px-4 py-3.5 mt-1 text-[13px]" /></div><div><p className="text-[11px] font-bold">Girth *</p><input value={form.girth} onChange={e=>setForm({...form, girth:e.target.value})} className="w-full border rounded-full px-4 py-3.5 mt-1 text-[13px]" /></div></div>
          <div><p className="text-[11px] font-bold">Village *</p><input value={form.location_village} onChange={e=>setForm({...form, location_village:e.target.value})} className="w-full border rounded-full px-4 py-3.5 mt-1 text-[13px]" /></div>
          <div><p className="text-[11px] font-bold">WhatsApp *</p><input value={form.contact_phone} onChange={e=>setForm({...form, contact_phone:e.target.value})} className="w-full border-2 border-black rounded-full px-4 py-3.5 mt-1 text-[13px] font-bold" placeholder="9876543210" /></div>
        </div>
        <button onClick={createListing} disabled={uploading} className="mt-8 w-full bg-black text-white py-4 rounded-full font-bold text-[14px]">{uploading?`Uploading ${files.length} Photos... ${uploadProgress}% ⏳`:`Submit with ${files.length} Photos → Fix TM-809352`}</button>
        <p className="text-[10px] text-zinc-400 text-center mt-3">If upload fails - Step 1 SQL must run in Supabase!</p>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-[360px] w-full text-center shadow-2xl">
            <div className="text-[64px] animate-bounce">🎉</div>
            <h2 className="text-[22px] font-extrabold mt-2">Submitted!</h2>
            <p className="text-[13px] text-zinc-600 mt-2">Lot {newId} with {files.length} photos submitted!</p>
            <div className="mt-5 flex flex-col gap-2.5"><button onClick={()=>router.push(`/p/${newId}`)} className="w-full bg-black text-white py-3.5 rounded-full font-bold text-[13px]">View Lot {files.length}/{files.length} →</button><button onClick={()=>{ setShowSuccess(false); setFiles([]); setPreviews([]); router.push('/admin'); }} className="w-full border py-3 rounded-full font-bold text-[13px]">Go to Admin to Approve</button></div>
          </div>
        </div>
      )}
    </div>
  );
}