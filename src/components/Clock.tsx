import React, { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Tegucigalpa',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'America/Tegucigalpa',
  };

  const dateString = time.toLocaleDateString('es-HN', options);
  const timeString = time.toLocaleTimeString('es-HN', timeOptions);

  return (
    <div className="flex flex-col items-end text-white/90">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
        {dateString}
      </p>
      <p className="text-sm font-black font-mono">
        {timeString}
      </p>
    </div>
  );
}
