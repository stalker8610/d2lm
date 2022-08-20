import React from 'react'

const LoginButton = (props) => {

    return <a href={props.href}>Login</a>

}

const LogoutButton = (props) => {

    return <a href={props.href}>Logout</a>

}


export default class LoginController extends React.Component {


    constructor(props) {
        super(props);
        this.authRef = '';
        this.state = { loggedIn: false };
    };



    componentDidMount() {

        if (!this.state.loggedIn) {
            fetch('/getAuthUrl')
                .then( result => {
                    console.log(result);
                    result.json()})
                .then(json => {
                    console.log(json);
                    this.authRef = json
                });

        }
    }


    logIn() {
        this.setState({ loggedIn: true })
    }

    logOut() {
        this.setState({ loggedOut: false })
    }

    render() {
        return (this.state.loggedIn) ? <LogoutButton href='/logout' /> : <LoginButton href={this.authRef} />;

    }

}