import React from 'react'
import classes from './Header.module.css'
import LoginController from '../LoginController'

const Header = (props) =>{

    return (

        <div className={classes.header}>
            <span className = {classes.headerLogo}>
                Please login to proceed
            </span>
            <span className = {classes.headerButton}>
                <LoginController loggedIn = {props.loggedIn}/>
            </span>
        </div>
    )

}

export default Header;