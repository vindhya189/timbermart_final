// pages/whatsapp.js - WITH PHOTO UPLOAD + DIRECT POST
import { useState } from 'react';

export default function WhatsAppPage() {
  const WHATSAPP_NUMBER = "918978987344";
  const [role, setRole] = useState('farmer');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    title: 'Patta teak wood logs for sale',
    name: '', phone: '', timber: 'Teak Wood',
    qty: '200', unit: 'numbers', size: '3ft girth',
    location: 'ANAKAPALLI', digipin: '',
    price: '5000', priceType: 'per tree', company: ''
  });

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 4);
    setPhotos(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const farmerText = `🌳 *TIMBER FOR SALE - DIRECT LISTING*

*TITLE:* ${form.title}
*TIMBER:* ${form.timber}
*QTY:* ${form.qty} ${form.unit}
*SIZE:* ${form.size}
*PRICE:* Rs ${form.price} ${form.priceType}
*NAME:* ${form.name}
*PHONE:* ${form.phone}
*LOCATION:* ${form.location}
*DIGIPIN:* ${form.digipin}
*PHOTOS:* ${photos.length} photos attached`;

  const buyerText = `🔍 *TIMBER WANTED*

*TITLE:* ${form.title}
*TIMBER NEED:* ${form.timber}
*QTY:* ${form.qty} ${form.unit}
*PRICE OFFER:* Rs ${form.price} ${form.priceType}
*NAME/COMPANY:* ${form.company || form.name}
*PHONE:* ${form.phone}
*LOCATION:* ${form.location}`;

  const finalText = role === 'farmer' ? farmerText : buyerText;

  const handleDirectPost = async () => {
    if (!form.name || !form.phone || !form.title) {
      alert('Name, Phone, Title compulsory akka!');
      return;
    }
    setUploading(true);
    try {
      // 1. Upload photos to server (if you have /api/upload, else base64)
      let uploadedUrls = [];
      if (photos.length > 0) {
        // Try to upload via your existing upload API
        for (let file of photos) {
          const fd = new FormData();
          fd.append('file', file);
          const up = await fetch('/api/upload', { method: 'POST', body: fd });
          if (up.ok) {
            const d = await up.json();
            if (d.url) uploadedUrls.push(d.url);
          }
        }
      }

      // 2. Post to buyer_requirements
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          buyer_name: form.name,
          phone: form.phone,
          timber_type: form.timber,
          quantity: form.qty,
          unit: form.unit,
          size: form.size,
          location: form.location,
          digipin: form.digipin,
          price: form.price,
          price_type: form.priceType,
          photo_urls: uploadedUrls.length > 0 ? uploadedUrls : photoPreviews,
          is_wanted: role === 'buyer'
        })
      });
      
      if (res.ok) {
        alert('✅ Website lo post ayyindi! Ippudu WhatsApp kuda pampisthunna.');
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(finalText)}`;
        window.open(url, '_blank');
      } else {
        alert('Post lo error, kani WhatsApp pampachu');
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(finalText)}`, '_blank');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] p-4">
      <div className="max-w-[480px] mx-auto bg-white rounded-2xl shadow p-5">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-black text-[15px]">📲 WhatsApp Direct Listing</h1>
          <a href="/" className="text-[11px] border px-3 py-1 rounded-full">✕ Home</a>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setRole('farmer')} className={`py-2 rounded-xl font-bold text-[11px] border ${role === 'farmer' ? 'bg-green-600 text-white' : 'bg-white'}`}>👨‍🌾 FARMER SALE</button>
          <button onClick={() => setRole('buyer')} className={`py-2 rounded-xl font-bold text-[11px] border ${role === 'buyer' ? 'bg-blue-600 text-white' : 'bg-white'}`}>🔍 BUYER WANTED</button>
        </div>

        <div className="space-y-2">
          <input className="w-full border p-2.5 rounded-xl text-[12px]" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="Me peru" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="Price - 5000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <select className="border p-2.5 rounded-xl text-[12px]" value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value })}><option>per tree</option><option>per ton</option><option>per cft</option><option>lumpsum</option></select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="Qty - 200" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
            <select className="border p-2.5 rounded-xl text-[12px]" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option>numbers</option><option>tons</option><option>cft</option></select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <input className="border p-2.5 rounded-xl text-[12px]" placeholder="DIGIPIN (optional)" value={form.digipin} onChange={e => setForm({ ...form, digipin: e.target.value })} />
          </div>

          {/* PHOTO UPLOAD - NEW */}
          <div className="mt-3 border-2 border-dashed border-green-300 rounded-xl p-3 bg-green-50/50">
            <p className="text-[11px] font-bold text-green-700 mb-2">📸 Photos Upload - Max 4</p>
            <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="w-full text-[11px] file:mr-2 file:bg-green-600 file:text-white file:border-0 file:px-3 file:py-1.5 file:rounded-full file:text-[11px] file:font-bold" />
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {photoPreviews.map((src, i) => (
                  <img key={i} src={src} className="w-full h-16 object-cover rounded-lg border" />
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-2">Photos select cheste direct website lo + WhatsApp lo kuda velthayi</p>
          </div>
        </div>

        <div className="mt-3 bg-gray-50 border rounded-xl p-2.5">
          <p className="text-[10px] font-bold text-gray-500">PREVIEW:</p>
          <pre className="text-[10.5px] whitespace-pre-wrap font-sans mt-1 leading-[14px]">{finalText}</pre>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-4">
          <button onClick={handleDirectPost} disabled={uploading} className="bg-black text-white py-3 rounded-xl font-black text-[13px] shadow">
            {uploading ? '⏳ Uploading & Posting...' : '✅ Post to Website + WhatsApp'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { navigator.clipboard.writeText(finalText); alert('Copied!'); }} className="bg-white border py-2.5 rounded-xl font-bold text-[12px]">📋 Copy Text</button>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(finalText)}`} target="_blank" className="bg-[#25D366] text-white py-2.5 rounded-xl font-bold text-[12px] text-center">💬 Only WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  );
}