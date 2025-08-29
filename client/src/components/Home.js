import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [documents, setDocuments] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/documents', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Handle token expiration or invalid token
      if (error.response && error.response.status === 401) {
        logout(); // Log out the user if token is invalid or expired
      }
    }
  };

  const createDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const initialContent = { ops: [{ insert: '\n' }] }; // Initial empty document
      const response = await axios.post('http://localhost:5000/api/documents', 
        { 
          title: newDocTitle || 'Untitled Document',
          content: initialContent
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setNewDocTitle(''); // Clear the input after successful creation
      navigate(`/document/${response.data._id}`);
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>Your Documents</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      <div className="create-document">
        <h2>Create New Document</h2>
        <div className="create-form">
          <input
            type="text"
            placeholder="Document Title"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
          />
          <button onClick={createDocument}>Create</button>
        </div>
      </div>

      <div className="documents-list">
        {documents.length === 0 ? (
          <p>No documents found. Create one to get started!</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className="document-item"
              onClick={() => navigate(`/document/${doc._id}`)}
            >
              <h3>{doc.title}</h3>
              <p>Last modified: {new Date(doc.lastModified).toLocaleString()}</p>
              <p>Owner: {doc.owner ? doc.owner.username : 'Unknown'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home; 