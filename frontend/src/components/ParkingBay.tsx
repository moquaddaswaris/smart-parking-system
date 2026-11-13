"use client";

import { ParkingSlotData } from "@/types/parking";
import { COURTYARD_TOPOLOGY, VEHICLE_STYLES } from "@/lib/courtyardTopology";

interface ParkingBayProps {
  slot: ParkingSlotData;
  isFitMode: boolean;
  matchesFilter: boolean;
  isSelected: boolean;
  onSelect: (slot: ParkingSlotData) => void;
}

export function VerticalCarGraphic({
  styleIdx,
  isFitMode,
}: {
  styleIdx: number;
  isFitMode: boolean;
}) {
  const car = VEHICLE_STYLES[styleIdx % VEHICLE_STYLES.length];
  const sizeClass = isFitMode ? "w-[15px] h-[30px]" : "w-[28px] h-[56px]";

  return (
    <svg
      className={`${sizeClass} drop-shadow-sm shrink-0 pointer-events-none select-none`}
      viewBox="0 0 44 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="5" y="4" width="34" height="74" rx="9" fill="#0F172A" fillOpacity="0.32" />
      <rect x="2" y="25" width="4" height="7" rx="2" fill={car.roof} />
      <rect x="38" y="25" width="4" height="7" rx="2" fill={car.roof} />
      <rect x="6" y="3" width="32" height="74" rx="9" fill={car.body} stroke={car.stroke} strokeWidth="1.6" />
      <path d="M10 22C10 18.5 14 16 22 16C30 16 34 18.5 34 22L32 30H12L10 22Z" fill="#0F172A" />
      <rect x="11" y="31" width="22" height="23" rx="4" fill={car.roof} stroke={car.stroke} strokeWidth="0.9" />
      <path d="M12 55H32L33.5 62C33.5 64.5 29 66 22 66C15 66 10.5 64.5 10.5 62L12 55Z" fill="#0F172A" />
      <rect x="9" y="4.5" width="6" height="2.2" rx="1" fill="#FEF08A" />
      <rect x="29" y="4.5" width="6" height="2.2" rx="1" fill="#FEF08A" />
      <rect x="9" y="73.5" width="6" height="2" rx="1" fill="#EF4444" />
      <rect x="29" y="73.5" width="6" height="2" rx="1" fill="#EF4444" />
    </svg>
  );
}

export default function ParkingBay({
  slot,
  isFitMode,
  matchesFilter,
  isSelected,
  onSelect,
}: ParkingBayProps) {
  const { id, occupied } = slot;
  const topology = COURTYARD_TOPOLOGY[id];
  const code = topology?.code || `P${String(id).padStart(2, "0")}`;
  const styleIdx = topology?.styleIdx ?? (id % VEHICLE_STYLES.length);

  const dimClass = matchesFilter ? "opacity-100 scale-100" : "opacity-25 scale-[0.96]";
  const selectedClass = isSelected
    ? "ring-2 ring-sky-400 ring-offset-2 z-10"
    : "";
  const cvStyleClass = occupied ? "cv-bay-occupied" : "cv-bay-available";

  if (occupied) {
    const badgeText = isFitMode ? code : `${code}: BUSY`;
    const badgeClass = isFitMode
      ? "w-full text-center py-[2px] rounded-xs bg-[#dc2626] text-white font-mono text-[7px] font-bold leading-none tracking-tighter"
      : "w-full text-center py-0.5 px-0.5 rounded-xs bg-[#dc2626] text-white font-mono text-[8px] font-bold leading-none tracking-tight shadow-xs truncate";

    return (
      <button
        type="button"
        onClick={() => onSelect(slot)}
        aria-label={`${code} Occupied`}
        className={`h-full w-full rounded-md ${cvStyleClass} ${dimClass} ${selectedClass} p-0.5 flex flex-col items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden active:scale-95`}
      >
        <span className={badgeClass}>{badgeText}</span>
        <div className="my-auto flex items-center justify-center">
          <VerticalCarGraphic styleIdx={styleIdx} isFitMode={isFitMode} />
        </div>
      </button>
    );
  }

  const badgeText = isFitMode ? code : `${code}: FREE`;
  const badgeClass = isFitMode
    ? "w-full text-center py-[2px] rounded-xs bg-[#16a34a] text-white font-mono text-[7px] font-bold leading-none tracking-tighter"
    : "w-full text-center py-0.5 px-0.5 rounded-xs bg-[#16a34a] text-white font-mono text-[8px] font-bold leading-none tracking-tight shadow-xs truncate";

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      aria-label={`${code} Available`}
      className={`h-full w-full rounded-md ${cvStyleClass} ${dimClass} ${selectedClass} p-0.5 flex flex-col items-center justify-between transition-all duration-150 cursor-pointer overflow-hidden active:scale-95`}
    >
      <span className={badgeClass}>{badgeText}</span>
      {isFitMode ? (
        <span className="my-auto text-[6.5px] font-black text-emerald-950 uppercase">
          FREE
        </span>
      ) : (
        <span className="my-auto text-[8px] font-black uppercase tracking-wider text-emerald-950/90 -rotate-90">
          AVAIL
        </span>
      )}
    </button>
  );
}

