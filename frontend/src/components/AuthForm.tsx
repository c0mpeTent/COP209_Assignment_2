import React, { useState } from "react";
import styles from "./AuthForm.module.css";
import { useNavigate } from "react-router-dom";

const AuthForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user_name, setUser_name] = useState("");

  const OnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mode = isLogin ? "login" : "singup";
    console.log("summited " + email + " " + password + " in mode : " + mode);
    // 1. Determine the correct endpoint
    const backendUrl = import.meta.env.VITE_BACKEND_ORIGIN;
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { email, password, name, avatarUrl: "" }; // Matches your User model

    try {
      // 2. Make the API Request
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include", // Include cookies for session management
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      // 3. Success! Handle the response
      console.log("Success:", data);

      if (isLogin) {
        // navigate("/dashboard");
        navigate("/dashboard");
        window.location.reload();

        alert("Login Successful!");
      } else {
        alert("Registration Successful! Please login.");
        setIsLogin(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.container}>
      <h2>{isLogin ? "Login To your Account" : "Create New Account"}</h2>
      <br></br>
      <form onSubmit={OnSubmit}>
        {!isLogin && (<div>
          <h3> User name </h3>
          <input
            className={styles.input_field}
            type="text"
            id="user_name"
            value={user_name}
            onChange={(ev) => setUser_name(ev.target.value)}
            required
          />
        </div>)}
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
        <button type="submit">{isLogin ? "Login" : "Sign Up"}</button>
      </form>

      <p>
        {isLogin ? "Create new Account?  " : "Already have Account?  "}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
          }}
        >
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </p>
    </div>
  );
};

export default AuthForm;
