import React, { useState, useEffect } from 'react';
import './MainsForm.css';

const Leftnavbar = () => {
  // State to keep track of the active button
  const [activeButton, setActiveButton] = useState('');

  // Effect to update active button based on current path
  
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/Examselection') {
      setActiveButton('Exam');
    } else {
      setActiveButton(''); // Reset or set to another value if needed
    }
  }, [window.location.pathname]);

  
  return (
    <div>
      <div className="sidebar">
        <a href="/">
          <button className={`nav-button ${activeButton === 'Exam' ? 'active' : ''}`}>
            Exam
          </button>
        </a>
      </div>
    </div>
  );
};

export default Leftnavbar;
