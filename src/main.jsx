import React,{useEffect,useState} from 'react'; import {createRoot} from 'react-dom/client'; import {BrowserRouter} from 'react-router-dom'; import {onAuthStateChanged,auth} from './lib/firebase'; import App from './App'; import './styles.css';
function Root(){const [user,setUser]=useState(undefined); useEffect(()=>onAuthStateChanged(auth,setUser),[]); if(user===undefined)return <div className="splash">WyDoc</div>; return <App user={user}/>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Root/></BrowserRouter>);
