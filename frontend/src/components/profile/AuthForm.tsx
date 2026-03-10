import React , {useState} from 'react';
import styles from './AuthForm.module.css';

const AuthForm: React.FC = () => {
    const [isLogin , setIsLogin] = useState(true);
    const [email ,setEmail] = useState('');
    const [password , setPassword ] = useState('');

    const OnSubmit = ( e : React.FormEvent ) => {
        e.preventDefault();
        const mode = isLogin ? 'login' : 'singup';
        console.log("summited " + email + " " + password + " in mode : " + mode);
    }
  
    return (
        <div className={styles.container}> 
            <h2 >{ isLogin ? 'Login To your Account' : 'Create New Account'}</h2>
            <br></br>
            <form onSubmit={OnSubmit}>
                <div>
                    <h3> Email </h3>
                    <input
                        className={styles.input_field}
                        type="email"
                        id="email"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        required

                    />
                </div>
                <div>
                    <h3> User name </h3>
                    <input
                        className={styles.input_field}
                        type="text"
                        id="user_name"
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                        required
                    />
                </div>
                <div>
                    <h3> Password </h3>
                    <input
                        className={styles.input_field}
                        type="password"
                        id="password"
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                        required
                    />
                </div>
                <br></br>
                <button type='submit'>
                    {isLogin ? 'Login' : 'Sign Up'}
                </button>
            </form>

            <p>
                {isLogin ? 'Create new Account?  ' : 'Already have Account?  '}
                <button onClick = {()=>{setIsLogin(!isLogin) }} > 
                {isLogin ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </div>
    );
};

export default AuthForm