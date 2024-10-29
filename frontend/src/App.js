import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamCreation from './components/ExamCreation';
function App() {
  return (
    <div>
      <BrowserRouter>
      <Routes>
      <Route path='/' element={<ExamCreation />} />
      </Routes>
      </BrowserRouter>

    </div>
  );
}

export default App;
