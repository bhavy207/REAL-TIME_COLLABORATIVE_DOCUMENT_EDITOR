import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/documents');
      setDocuments(response.data);
      setError('');
    } catch (error) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      await axios.post('http://localhost:5000/api/documents', {
        title: newDocumentTitle
      });
      setShowNewDocumentDialog(false);
      setNewDocumentTitle('');
      setError('');
      fetchDocuments(); // Refetch after create
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await axios.delete(`http://localhost:5000/api/documents/${documentId}`);
      setError('');
      fetchDocuments(); // Refetch after delete
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete document');
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">My Documents</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowNewDocumentDialog(true)}
            sx={{ mr: 2 }}
          >
            New Document
          </Button>
          <Button variant="outlined" color="secondary" onClick={logout}>
            Logout
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {documents.map((document) => (
          <Grid item xs={12} sm={6} md={4} key={document._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {document.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last modified: {new Date(document.lastModified).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate(`/documents/${document._id}`)}
                >
                  Open
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteDocument(document._id)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={showNewDocumentDialog} onClose={() => setShowNewDocumentDialog(false)}>
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            fullWidth
            value={newDocumentTitle}
            onChange={(e) => setNewDocumentTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewDocumentDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDocument} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents; 