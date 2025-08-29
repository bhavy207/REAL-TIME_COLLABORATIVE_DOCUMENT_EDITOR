import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const DocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [showCollaboratorDialog, setShowCollaboratorDialog] = useState(false);
  const quillRef = useRef(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/documents/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setDocument(response.data);
        setLoading(false);
      } catch (error) {
        setError('Failed to load document');
        setLoading(false);
      }
    };

    fetchDocument();

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('join-document', id);

    return () => {
      newSocket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!socket || !quillRef.current) return;

    const quill = quillRef.current.getEditor();

    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', handler);

    return () => {
      socket.off('receive-changes', handler);
    };
  }, [socket]);

  const handleTextChange = (delta, oldDelta, source) => {
    if (source === 'user' && socket) {
      socket.emit('document-change', {
        documentId: id,
        delta
      });
    }
  };

  const handleAddCollaborator = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/documents/${id}/collaborators`,
        { collaboratorEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDocument(response.data.document);
      setShowCollaboratorDialog(false);
      setCollaboratorEmail('');
      alert('Collaborator added successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add collaborator');
      alert(error.response?.data?.error || 'Failed to add collaborator');
    }
  };

  const handleDeleteDocument = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/documents/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        navigate('/');
      } catch (error) {
        setError('Failed to delete document');
        alert('Failed to delete document');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{document.title}</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setShowCollaboratorDialog(true)}
            sx={{ mr: 2 }}
          >
            Add Collaborator
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteDocument}
          >
            Delete Document
          </Button>
        </Box>
      </Box>

      {document.collaborators && document.collaborators.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Collaborators:</Typography>
          <List>
            {document.collaborators.map((collaborator) => (
              <ListItem key={collaborator._id}>
                <ListItemText
                  primary={collaborator.username}
                  secondary={collaborator.email}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Paper elevation={3} sx={{ p: 2 }}>
        <ReactQuill
          ref={quillRef}
          value={document.content}
          onChange={handleTextChange}
          style={{ height: '70vh' }}
        />
      </Paper>

      <Dialog open={showCollaboratorDialog} onClose={() => setShowCollaboratorDialog(false)}>
        <DialogTitle>Add Collaborator</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Collaborator Email"
            type="email"
            fullWidth
            value={collaboratorEmail}
            onChange={(e) => setCollaboratorEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCollaboratorDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCollaborator} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentEditor; 