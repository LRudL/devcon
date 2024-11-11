import React, { useEffect, useRef, useState } from 'react';
import './MementoMori.css';

interface MementoMoriProps {
  birthDate: Date;
}

const MementoMori: React.FC<MementoMoriProps> = ({ birthDate }) => {
  const yearsMonthsGridRef = useRef<HTMLDivElement>(null);
  const daysHoursGridRef = useRef<HTMLDivElement>(null);
  const minutesSecondsGridRef = useRef<HTMLDivElement>(null);
  const [age, setAge] = useState<string>('');
  const [lastMinute, setLastMinute] = useState<number>(0);
  const [lastSecond, setLastSecond] = useState<number>(0);

  useEffect(() => {
    const populateYearsMonthsGrid = () => {
      if (!yearsMonthsGridRef.current) return;
      const grid = yearsMonthsGridRef.current;
      grid.innerHTML = '';

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Add month labels
      monthNames.forEach((month, i) => {
        const label = document.createElement('div');
        label.classList.add('grid-cell', 'label');
        label.textContent = month;
        if (i === currentMonth + 1) {
          label.classList.add('label-active');
        }
        grid.appendChild(label);
      });

      // Add years and months
      for (let year = birthDate.getFullYear(); year <= birthDate.getFullYear() + 49; year++) {
        const yearLabel = document.createElement('div');
        yearLabel.classList.add('grid-cell', 'label');
        yearLabel.textContent = year.toString();
        if (year === currentYear) {
          yearLabel.classList.add('label-active');
        }
        grid.appendChild(yearLabel);

        for (let month = 0; month < 12; month++) {
          const cell = document.createElement('div');
          cell.classList.add('grid-cell');
          if (year < currentYear || (year === currentYear && month < currentMonth)) {
            cell.classList.add('past');
          } else if (year === currentYear && month === currentMonth) {
            cell.classList.add('current');
          }
          grid.appendChild(cell);
        }
      }
    };

    const populateDaysHoursGrid = () => {
      if (!daysHoursGridRef.current) return;
      const grid = daysHoursGridRef.current;
      grid.innerHTML = '';

      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentHour = currentDate.getHours();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Add hour labels
      for (let i = 0; i <= 24; i++) {
        const label = document.createElement('div');
        label.classList.add('grid-cell', 'label');
        label.textContent = i === 0 ? '' : `${(i - 1).toString().padStart(2, '0')}`;
        if (i - 1 === currentHour) {
          label.classList.add('label-active');
        }
        grid.appendChild(label);
      }

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Add days and hours
      for (let day = 1; day <= daysInMonth; day++) {
        const dayLabel = document.createElement('div');
        dayLabel.classList.add('grid-cell', 'label');
        dayLabel.textContent = `${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() === 1) {
          dayLabel.classList.add('label-monday');
        }
        
        if (day === currentDay) {
          dayLabel.classList.add('label-active');
        }
        grid.appendChild(dayLabel);

        for (let hour = 0; hour < 24; hour++) {
          const cell = document.createElement('div');
          cell.classList.add('grid-cell');
          if (day < currentDay || (day === currentDay && hour < currentHour)) {
            if (hour < 9) {
              cell.classList.add('past-sleep');
            } else {
              cell.classList.add('past');
            }
          } else if (day === currentDay && hour === currentHour) {
            cell.classList.add('current');
          }
          grid.appendChild(cell);
        }
      }
    };

    const populateMinutesSecondsGrid = () => {
      if (!minutesSecondsGridRef.current) return;
      const grid = minutesSecondsGridRef.current;
      grid.innerHTML = '';

      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      for (let minute = 0; minute < 60; minute++) {
        const minuteLabel = document.createElement('div');
        minuteLabel.classList.add('grid-cell', 'label');
        minuteLabel.textContent = minute.toString().padStart(2, '0');
        minuteLabel.id = `minute-label-${minute}`;
        if (minute === currentMinute) {
          minuteLabel.classList.add('label-active');
        }
        grid.appendChild(minuteLabel);

        for (let second = 0; second < 60; second++) {
          const cell = document.createElement('div');
          cell.classList.add('grid-cell', 'second');
          cell.id = `cell-${minute}-${second}`;
          if (minute < currentMinute || (minute === currentMinute && second <= currentSecond)) {
            cell.classList.add('past');
          }
          if (minute === currentMinute && second === currentSecond) {
            cell.classList.add('current');
          }
          grid.appendChild(cell);
        }
      }

      setLastMinute(currentMinute);
      setLastSecond(currentSecond);
    };

    const updateMinutesSeconds = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      if (currentMinute !== lastMinute || currentSecond !== lastSecond) {
        const lastCurrentCell = document.getElementById(`cell-${lastMinute}-${lastSecond}`);
        if (lastCurrentCell) {
          lastCurrentCell.classList.remove('current');
          lastCurrentCell.classList.add('past');
        }

        const currentCell = document.getElementById(`cell-${currentMinute}-${currentSecond}`);
        if (currentCell) {
          currentCell.classList.add('current');
        }

        if (currentMinute !== lastMinute) {
          for (let s = 0; s < currentSecond; s++) {
            const cell = document.getElementById(`cell-${currentMinute}-${s}`);
            if (cell) {
              cell.classList.add('past');
            }
          }

          const lastMinuteLabel = document.getElementById(`minute-label-${lastMinute}`);
          if (lastMinuteLabel) {
            lastMinuteLabel.classList.remove('label-active');
          }
          const currentMinuteLabel = document.getElementById(`minute-label-${currentMinute}`);
          if (currentMinuteLabel) {
            currentMinuteLabel.classList.add('label-active');
          }
        }

        setLastMinute(currentMinute);
        setLastSecond(currentSecond);
      }
    };

    const updateAgeCounter = () => {
      const currentDate = new Date();
      const ageInYears = (currentDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const ageInDays = (currentDate.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000);
      setAge(`${ageInYears.toFixed(8)} (${ageInDays.toFixed(0)} d)`);
    };

    // Initial population
    populateYearsMonthsGrid();
    populateDaysHoursGrid();
    populateMinutesSecondsGrid();
    updateAgeCounter();

    // Set up intervals
    const minutesInterval = setInterval(updateMinutesSeconds, 500);
    const ageInterval = setInterval(updateAgeCounter, 100);

    return () => {
      clearInterval(minutesInterval);
      clearInterval(ageInterval);
    };
  }, [birthDate, lastMinute, lastSecond]);

  return (
    <div className="page-container">
      <p className="counter">{age}</p>
      <div className="aspect-ratio-container">
        <div className="grids-container">
          <section className="grid-section">
            <div className="grid years-months-grid" ref={yearsMonthsGridRef} />
          </section>
          <section className="grid-section">
            <div className="grid days-hours-grid" ref={daysHoursGridRef} />
          </section>
          <section className="grid-section">
            <div className="grid minutes-seconds-grid" ref={minutesSecondsGridRef} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default MementoMori;