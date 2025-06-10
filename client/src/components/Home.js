import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const [documents, setDocuments] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const createDocument = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/documents', {
        title: newDocTitle || 'Untitled Document'
      });
      navigate(`/document/${response.data._id}`);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  return (
    <div className="home-container">
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
        <h2>Your Documents</h2>
        {documents.map((doc) => (
          <div
            key={doc._id}
            className="document-item"
            onClick={() => navigate(`/document/${doc._id}`)}
          >
            <h3>{doc.title}</h3>
            <p>Last modified: {new Date(doc.lastModified).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home; 