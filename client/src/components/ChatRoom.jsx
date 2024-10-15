import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import './ChatRoom.css';

const socket = io.connect('http://localhost:4000');
const ChatRoom = () => {
  const [step, setStep] = useState(1); 
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Student'); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(''); 
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const messagesEndRef = useRef(null);
  useEffect(() => {
    const handleMessage = (data) => {
      setMessages((prevMessages) => [...prevMessages, { sender: data.sender, message: data.msg, time: new Date().toLocaleTimeString() }]);
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const register = async () => {
    if (!name || !email || !phone || !password) {
      alert('All fields are required for registration.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/register', { name, role, email, phone, password });
      if (response.data.success) {
        alert('Registered successfully! You can now login.');
        setAuthMode('login'); 
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("An error occurred during registration.");
    }
    setLoading(false);
  };

  const login = async () => {
    if (!email || !password) {
      alert('Both email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/login', { email, password });
      if (response.data.success) {
        setName(response.data.user.name);
        setPhone(response.data.user.phone); 
        setRole(response.data.user.role);
        setStep(2); 
        socket.emit('join', { username: response.data.user.name });
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred during login.");
    }
    setLoading(false);
  };

  const sendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('message', { sender: name, msg: message });
      setMessage('');
    }
  };

  const handleEnterKey = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const logout = () => {
    setStep(1);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setMessages([]);
  };

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:4000/user/${email}`);
      if (response.data.success) {
        setName(response.data.user.name);
        setPhone(response.data.user.phone);
        setRole(response.data.user.role);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const updateUserDetails = async () => {
    try {
      const response = await axios.put(`http://localhost:4000/user/${email}`, { name, email, role });

      if (response.data.success) {
        alert('User information updated successfully!');
        setIsEditing(false); 
      } else {
        alert(response.data.message || 'Failed to update user details.');
      }
    } catch (error) {
      if (error.response) {
        console.error("Error updating user details:", error.response.data);
        alert(error.response.data.message || 'An error occurred while updating user details.');
      } else if (error.request) {
        console.error("Error updating user details:", error.request);
        alert('No response received from the server. Please try again later.');
      } else {
        console.error("Error updating user details:", error.message);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  };

  const deleteUserAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const response = await axios.delete(`http://localhost:4000/user/${email}`);
        if (response.data.success) {
          alert('Account deleted successfully.');
          logout(); 
        } else {
          alert(response.data.message);
        }
      } catch (error) {
        console.error("Error deleting account:", error);
      }
    }
  };

  return (
    <div className='div-color'>
      <div className="app">
        {step === 1 && (
          <div className="auth-container">
            <h3>{authMode === 'login' ? 'Login' : 'Register'}</h3>
            {authMode === 'register' && (
              <>
                <Form.Control type="text" placeholder="Enter Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)} />
                <br />
                <Form.Control type="tel" placeholder="Enter Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
                <br />
                <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Institute">Institute</option>
                </Form.Select>
                <br />
              </>
            )}

            <Form.Control type="email" placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)} />
            <br />
            <Form.Control type="password" placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => handleEnterKey(e, authMode === 'login' ? login : register)} />
            <br />

            <Button variant="success" onClick={authMode === 'login' ? login : register} disabled={loading}>
              {loading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Register'}
            </Button>

            <br />
            <Button variant="link" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Don\'t have an account? Register' : 'Already have an account? Login'}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="chat-container">
            <h1>Chat Room</h1>
            <div className="chat-box">
              <div className="messages">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.sender === name ? 'my-message' : msg.sender === 'system' ? 'system-message' : 'other-message'}`}
                  >
                    {msg.sender !== 'system' ? (
                      <p><strong>{msg.sender}: </strong>{msg.message}<span className="timestamp"><p className='a'>{msg.time}</p></span></p>
                    ) : (
                      <p>{msg.message}</p>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="message-input">
              <Form.Control size="lg" type="text" placeholder="Enter message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => handleEnterKey(e, sendMessage)} />
              <Button variant="success" onClick={sendMessage}>Send</Button>
            </div>
          <Button variant="danger" onClick={logout}>Logout</Button>
             
            <div className='con'>
             <div className="user-details">
              <h3>User Details</h3>
              {isEditing ? (
                <>
                   <div></div>
                  <Form.Control type="text" placeholder="Name"
                    value={name}
                    
                    onChange={(e) => setName(e.target.value)} />
                  <br />
                  <Form.Control type="email" placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                  <br />
                  <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Institute">Institute</option>
                  </Form.Select>
                  <br />
                  <Button variant="primary" onClick={updateUserDetails}>Save Changes</Button>
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                </>
              ) : (
                <div>
                  <p><strong>Name:</strong> {name}</p>
                  <p><strong>Email:</strong> {email}</p>
                  <p><strong>Role:</strong> {role}</p>
                  <Button variant="warning" onClick={() => setIsEditing(true)}>Edit</Button>
                  <Button variant="danger" onClick={deleteUserAccount}>Delete Account</Button>
                </div>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
