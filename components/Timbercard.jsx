import Link from 'next/link';
import { useState } from 'react';

export default function Timbercard({ item, userLocation = 'Delhi', cftRequired = 10, avgRate = 2900, rank = null, showLowestEngine = true }) {
  const [currentImg, setCurrentImg] = useState(0);
  const [saved, setSaved] = useState(false);

  const isNewFormat = item.listing_id && item.location_village;
  
  const displayTitle = isNewFormat 
    ? `${item.location_village} ${item.quantity_value} ${item.quantity_type} ${item.girth} - ${item.total_cmt_estimate} CMT`
    : item.title || item.displayTitle || 'Teak Wood';
  
  const displayLocation = isNewFormat
    ? `${item.location_village}, ${item.location_state}`
    : item.location || item.displayLocation || 'Rewa, MP';
  
  // SIMPLE - Only Rs. total rate - No transport breakdown
  const totalRatePerCFT = isNewFormat ? (item.total_rate_per_cft || item.price_value || 2300) : (parseInt(item.price) || 2500);
  const totalCostForRequired = totalRatePerCFT * cftRequired;
  
  const saveAmount = Math.max(0, avgRate - totalRatePerCFT);
  const savePercent = avgRate > 0 ? Math.round((saveAmount / avgRate) * 100) : 0;
  const isLowest = rank === 1 || item.is_lowest;
  
  const photos = item.photos || [];
  const phone = item.contact_phone || item.phone || '9XXXXXXXXX';
  const aiSummary = item.ai_summary || '';

  const shareableLink = `https://timbermart.com/p/${item.listing_id || item.id}`;
  const shareText = `${displayTitle} - ${displayLocation} - Rs.${totalRatePerCFT}/CFT - Save Rs.${saveAmount}/CFT - ${shareableLink}`;

  return (
    <div className={`bg-white rounded-[20px] overflow-hidden shadow-sm border hover:shadow-md transition-all ${isLowest ? 'border-2 border-green-700 bg-green-50' : 'border-gray-100'}`}>
      
      <div className="relative">
        {photos[0] ? (
          <img src={photos[currentImg]} alt={displayTitle} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[40px]">Wood</div>
              <p className="text-[11px] text-gray-500 mt-1">Teak Wood - {item.girth || '80cm+'}</p>
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {isLowest && (
            <span className="bg-green-700 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
              LOWEST RATE ALL INDIA
            </span>
          )}
          {isNewFormat && item.parse_confidence && (
            <span className="bg-yellow-400 text-black text-[9px] font-bold px-2 py-1 rounded-full shadow">
              WhatsApp Auto {Math.round(item.parse_confidence * 100)}%
            </span>
          )}
          {!isLowest && saveAmount > 100 && (
            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200">
              Save Rs.{saveAmount}/CFT {savePercent > 0 ? `${savePercent}%` : ''}
            </span>
          )}
        </div>

        <button 
          onClick={(e) => { e.preventDefault(); setSaved(!saved); }} 
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow text-[12px]"
        >
          {saved ? '♥' : '♡'}
        </button>

        {photos.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); setCurrentImg((currentImg - 1 + photos.length) % photos.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 w-6 h-6 rounded-full flex items-center justify-center">‹</button>
            <button onClick={(e) => { e.preventDefault(); setCurrentImg((currentImg + 1) % photos.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 w-6 h-6 rounded-full flex items-center justify-center">›</button>
          </>
        )}

        {aiSummary && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-[10px] font-medium truncate">{aiSummary}</p>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-[13px] line-clamp-2 leading-tight">{displayTitle}</h3>
            <p className="text-[11px] text-gray-500 mt-1">
              {displayLocation?.slice(0,45)} {rank && <span className="bg-gray-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">#{rank}</span>}
            </p>
          </div>
          <Link href={`/p/${item.listing_id || item.id}`} className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full">View</Link>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="bg-gray-50 text-[10px] px-2 py-1 rounded-full border">{item.species || 'Teak Wood'}</span>
          <span className="bg-gray-50 text-[10px] px-2 py-1 rounded-full border">{item.girth || '80cm+'}</span>
          <span className="bg-gray-50 text-[10px] px-2 py-1 rounded-full border">{isNewFormat ? `${item.quantity_value} ${item.quantity_type}` : ''}</span>
          {item.total_cmt_estimate && <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-full font-bold">{item.total_cmt_estimate} CMT</span>}
        </div>

        {/* SIMPLE - NO TRANSPORT - ONLY TOTAL RATE - FIXED */}
        {showLowestEngine && (
          <div className="mt-3 bg-gray-50 rounded-[12px] p-2.5 border border-green-100">
            <div className="flex justify-between items-center">
              <p className="text-[12px] font-bold text-green-800">Rs. {totalRatePerCFT}/CFT Total - Lowest Rate</p>
              {saveAmount > 0 && (
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">
                  Save Rs.{saveAmount}/CFT
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              Lowest Rs.{totalRatePerCFT}/CFT | Avg Rs.{avgRate}/CFT | All India comparison | Top 3 cheapest
            </p>
            {cftRequired > 1 && (
              <p className="text-[11px] font-bold mt-1">Total for {cftRequired} CFT: Rs. {(totalCostForRequired).toLocaleString('en-IN')}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3">
          <a href={`tel:${phone}`} className="bg-gray-50 text-center py-2 rounded-full text-[11px] font-bold border">Call</a>
          <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi, saw your listing ${displayTitle}`)}`} target="_blank" className="bg-green-50 text-green-700 text-center py-2 rounded-full text-[11px] font-bold border border-green-200">WhatsApp</a>
          <button 
            onClick={() => { 
              if (navigator.clipboard) {
                navigator.clipboard.writeText(shareText);
                alert('Link copied!');
              }
            }} 
            className="bg-black text-white text-center py-2 rounded-full text-[11px] font-bold"
          >
            Share
          </button>
        </div>

        <Link href={`/api/nearby-suppliers?location=${userLocation}&cft=${cftRequired}&view=html`} className="block mt-2 bg-white border border-green-200 text-green-700 text-center py-1.5 rounded-full text-[10px] font-bold">
          Lowest rate suppliers list - Link
        </Link>
      </div>
    </div>
  );
}