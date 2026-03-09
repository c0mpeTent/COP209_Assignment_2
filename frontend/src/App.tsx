import { useState ,useEffect } from 'react'
import { Routes, Route } from 'react-router-dom';
import './App.css'

import AuthForm from './components/profile/AuthForm'

function App() {

  return (
    <div className="app">
      <main className="app-component">
        <Routes>
          <Route path="/" element={<AuthForm/>}/>
        </Routes>
      </main>
    </div>
  )
}

export default App
