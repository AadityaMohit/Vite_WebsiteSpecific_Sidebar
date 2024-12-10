import React, { useState, useEffect } from 'react';
import { FaPlus, FaEye, FaList, FaInfoCircle } from 'react-icons/fa';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import NoteEditor from './NoteEditor';
import YouTubeTime from './YouTubeTime';
import './Home.css';

function Home() {
  const [editors, setEditors] = useState([]);
  const [pageTitle, setPageTitle] = useState('Loading...');
  const [pageUrl, setPageUrl] = useState('Loading...');
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [totalNotesCount, setTotalNotesCount] = useState(0);
  const [filteredNotesCount, setFilteredNotesCount] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [showInfo, setShowInfo] = useState(false);

   const getBaseUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.replace(/^www\./, '');
    } catch (error) {
      console.error('Invalid URL: ', error);
      return '';
    }
  };

  const toggleInfo = () => setShowInfo((prevShowInfo) => !prevShowInfo);

   const getYouTubeVideoId = (url) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes('youtube.com')) {
        return parsedUrl.searchParams.get('v');
      } else if (parsedUrl.hostname.includes('youtu.be')) {
        return parsedUrl.pathname.slice(1);
      }
      return null;
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      return null;
    }
  };

   const fetchNotes = (identifier) => {
    const notesCollection = collection(db, 'notes');
    onSnapshot(notesCollection, (querySnapshot) => {
      const notes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        content: doc.data().content,
        related_to: doc.data().related_to,
        youtube_title: doc.data().youtube_title,
        created_on: doc.data().created_on,
        last_modified: doc.data().last_modified,
        showDetails: false,
      }));

      const filteredNotes = showAllNotes ? notes : notes.filter((note) => note.related_to === identifier);
      setEditors(filteredNotes);
      setTotalNotesCount(notes.length);
      setFilteredNotesCount(filteredNotes.length);
    });
  };

   useEffect(() => {
    const queryActiveTab = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          setPageTitle(tabs[0].title);
          const videoId = getYouTubeVideoId(tabs[0].url) || getBaseUrl(tabs[0].url);
          setPageUrl(videoId);
          fetchNotes(videoId);
        }
      });
    };

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      queryActiveTab();
      chrome.tabs.onActivated.addListener(queryActiveTab);
      chrome.tabs.onUpdated.addListener(queryActiveTab);
    }

    return () => {
      if (chrome.tabs) {
        chrome.tabs.onActivated.removeListener(queryActiveTab);
        chrome.tabs.onUpdated.removeListener(queryActiveTab);
      }
    };
  }, [showAllNotes]);

  const addEditor = async () => {
    const currentDate = new Date().toISOString();
    let videoTitle = '';

    if (pageUrl && pageUrl.match(/^[A-Za-z0-9_-]{11}$/)) {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${pageUrl}&format=json`);
        const data = await response.json();
        videoTitle = data.title;
      } catch (error) {
        console.log('Failed to fetch YouTube title:', error);
      }
    }

    const newEditor = {
      content: ` `,
      related_to: pageUrl,
      youtube_title: videoTitle,
      created_on: currentDate,
      last_modified: currentDate,
    };

    const docRef = await addDoc(collection(db, 'notes'), newEditor);
    newEditor.id = docRef.id;

    setEditors((prevEditors) => [
      { ...newEditor, showDetails: false },
      ...prevEditors,
    ]);
    setTotalNotesCount(totalNotesCount + 1);
    if (!showAllNotes) setFilteredNotesCount(filteredNotesCount + 1);
  };

  const updateEditorContent = async (id, newContent) => {
    const currentDate = new Date().toISOString();
    const editorToUpdate = editors.find((editor) => editor.id === id);

    if (editorToUpdate) {
      const editorDocRef = doc(db, 'notes', id);
      await updateDoc(editorDocRef, {
        content: newContent,
        last_modified: currentDate,
      });
      setEditors((prevEditors) =>
        prevEditors.map((editor) =>
          editor.id === id ? { ...editor, content: newContent, last_modified: currentDate } : editor
        )
      );
    }
  };

  const deleteEditor = async (id) => {
    await deleteDoc(doc(db, 'notes', id));
    const updatedEditors = editors.filter((editor) => editor.id !== id);
    setEditors(updatedEditors);
    setTotalNotesCount(totalNotesCount - 1);
    if (!showAllNotes) setFilteredNotesCount(filteredNotesCount - 1);
  };

  const toggleShowAllNotes = () => setShowAllNotes((prevState) => !prevState);

  const toggleDetails = (id) => {
    setEditors((prevEditors) =>
      prevEditors.map((editor) =>
        editor.id === id ? { ...editor, showDetails: !editor.showDetails } : editor
      )
    );
  };

  return (
    <div className="container">
      <div className="header">
        <div className="button-group">
          <button onClick={addEditor} className="add-note-button"><FaPlus/></button>
          <button onClick={toggleShowAllNotes} className="show-all-notes-button">
            {showAllNotes ? <FaList style={{ marginRight: '8px' }} /> : <FaEye style={{ marginRight: '8px' }} />}
          </button>
          <button onClick={toggleInfo} className="new-button">
            <FaInfoCircle className="info-icon" />
          </button>
        </div>
        {showInfo && (
          <p className="info">
            <b>{filteredNotesCount}</b> Notes visible &nbsp;
            <b>{totalNotesCount}</b> Notes total &nbsp;
            <u><b>{pageUrl}</b></u>
          </p>
        )}
        {pageUrl && pageUrl.match(/^[A-Za-z0-9_-]{11}$/) && showInfo && (
          <YouTubeTime setCurrentTime={setCurrentTime} setDuration={setDuration} />
        )}
      </div>
      <div className="notes-area">
        {editors.map((editor, index) => (
          <div key={editor.id} style={{ marginBottom: '20px' }}>
            <NoteEditor
              noteNumber={index + 1}
              content={editor.content}
              youtubeTitle={editor.youtube_title}
              updateContent={(newContent) => updateEditorContent(editor.id, newContent)}
              onDelete={() => deleteEditor(editor.id)}
              currentTime={currentTime}
              pageUrl={pageUrl}
            />
          </div>
        ))}
      </div>
      <div className="footer"></div>
    </div>
  );
}

export default Home;
