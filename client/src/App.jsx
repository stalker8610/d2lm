import React from 'react'
import { useLocation, Routes, Route } from 'react-router-dom'
import './App.css'

import Header from './Components/Header/Header'

function App() {

    const search = useLocation().search;
    const authError = new URLSearchParams(search).get('authError');
    const sessionID = new URLSearchParams(search).get('sessionId');

    //debugger;

    return (
        <div className='appWrapper'>
            
                
                    <Header loggedIn={!!sessionID} />
                    { (!!authError) ? <div> Error occured while autentication: {authError} </div> : ''}
            
                {/* <Routes>
                    <Route path='/login'> <LoginPage loggedIn={true} /></Route>
                    <Route path='/main'> <MainPage user={this.state.user} expiredAt={this.state.expiredAt} /> </Route>
                </Routes> */}
            
        </div>
    )

}

export default App;