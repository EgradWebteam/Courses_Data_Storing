import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamCreation from './components/ExamCreation';
import DocumentUpload from './components/DocumentUpload'
function App() {
  return (
    <div>
      <BrowserRouter>
      <Routes>
      {/* <Route path='/' element={<ExamCreation />} /> */}
      <Route path='/' element={<DocumentUpload />} />
      </Routes>
      </BrowserRouter>

    </div>
  );
}

export default App;
