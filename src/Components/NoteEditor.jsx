import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Node, mergeAttributes } from '@tiptap/core';
import './Home.css';
import Image from '@tiptap/extension-image';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const limit = 300;

 
const TimestampLink = Node.create({
  name: 'timestampLink',
  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      time: { default: null },
      url: { default: null },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'button',
      mergeAttributes(HTMLAttributes, { class: 'timestamp-button', 'data-url': HTMLAttributes.url, type: 'button' }),
      HTMLAttributes.time,
      ['span', { class: 'arrow-icon', 'data-url': HTMLAttributes.url }, '▼'],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'button[data-url]',
        getAttrs: (dom) => ({
          time: dom.innerText,
          url: dom.getAttribute('data-url'),
        }),
      },
    ];
  },

  addCommands() {
    return {
      insertTimestampLink: (time, url) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { time, url },
        });
      },
    };
  },
});

function NoteEditor({ noteNumber, content, updateContent, onDelete, onCopy, currentTime, pageUrl,createdOn, lastModified ,youtubeTitle,toggleDetails, showDetails}) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const isYouTubeRelated = pageUrl && pageUrl.match(/^[A-Za-z0-9_-]{11}$/);
  const editorContainerRef = useRef(null);  
  const [youtubeTitlee, setYoutubeTitlee] = useState('');   
  const [imageInserted, setImageInserted] = useState(false); 

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your notes...' }),
      CharacterCount.configure({ limit }),
      TimestampLink,   
      Image,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      const lastParagraphs = htmlContent.match(/<p>(.*?)<\/p>/g) || [];
      const lastParagraph = lastParagraphs[lastParagraphs.length - 1];
      const containsTimestamp = lastParagraph && lastParagraph.match(/<button.*?data-url.*?<\/button>/g);

      if (lastParagraph && isYouTubeRelated) {
        if (containsTimestamp && containsTimestamp.length >= 1) {
          return;
        }
        const timestampInSeconds = convertTimeToSeconds(currentTime);
        const youtubeUrlWithTimestamp = `https://www.youtube.com/watch?v=${pageUrl}&t=${timestampInSeconds}s`;

        editor.commands.insertTimestampLink(currentTime, youtubeUrlWithTimestamp);
      }

      updateContent(editor.getHTML());
      setIsTyping(true);
      resetTypingTimeout();
    },
  });

  const resetTypingTimeout = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => setIsTyping(false), 500));
  };
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result;  
        editor.commands.setImage({ src: imageUrl }); 
        setImageInserted(true);  
      };
      reader.readAsDataURL(file);
    }
  };
  const toggleImage = () => {
    if (imageInserted) {
      editor.commands.setContent(editor.getHTML().replace(/<img.*?>/g, ''));  
      setImageInserted(false);  
    } else {
      document.getElementById('image-upload-input').click();  
    }
  };
    
  const handleSeekVideo = (url) => {
    const timestamp = new URL(url).searchParams.get('t');  
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
  
      if (activeTab.url.includes('youtube.com/watch')) {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          function: seekYouTubeVideo,
          args: [timestamp],
        });
      } else {
        console.log('Cannot seek video. Not on a YouTube page.');
      }
    });
  };
  
  function seekYouTubeVideo(timestamp) {
    const player = document.querySelector('video');  
    if (player) {
      const seconds = parseInt(timestamp, 10);
      player.currentTime = seconds;  
    } else {
      console.log('YouTube video player not found.');
    }
  }
  

  const handleCopyURL = (url) => {
    navigator.clipboard.writeText(url);
    console.log(`Copied URL: ${url}`);
  };

  const handleOpenInNewTab = (url) => {
    window.open(url, '_blank');
  };

  const convertTimeToSeconds = (timeString) => {
    const parts = timeString.split(':').reverse();
    let seconds = 0;
    if (parts[0]) seconds += parseInt(parts[0], 10);
    if (parts[1]) seconds += parseInt(parts[1], 10) * 60;
    if (parts[2]) seconds += parseInt(parts[2], 10) * 3600;
    return seconds;
  };
 
const fetchYouTubeTitle = async (videoId) => {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const data = await response.json();
    setYoutubeTitlee(data.title); 
  } catch (error) {
    console.log('Failed to fetch YouTube title:', error);
  }
};
useEffect(() => {
  if (isYouTubeRelated) {
    fetchYouTubeTitle(pageUrl);   
  }
}, [pageUrl]);

  const handleTimestampClick = (url, buttonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    const editorContainerRect = editorContainerRef.current.getBoundingClientRect();
  
    if (showDropdown && showDropdown.url === url) {
      setShowDropdown(null);  
    } else {
      setShowDropdown({
        url: url,
        top: rect.bottom - editorContainerRect.top-56,   
        left: rect.left - editorContainerRect.left,   
      });
    }
  };
  

  useEffect(() => {
    return () => typingTimeout && clearTimeout(typingTimeout);
  }, [typingTimeout]);

  if (!editor) return null;

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.getText().trim().split(/\s+/).filter(word => word.length > 0).length;
  const percentage = Math.round((100 / limit) * characterCount);

  return (
    <div className="note-editor" ref={editorContainerRef} onClick={(e) => {
      const target = e.target;
      const url = target.getAttribute('data-url');
       
      if ((target.tagName === 'BUTTON' && target.classList.contains('timestamp-button')) || 
          (target.tagName === 'SPAN' && target.classList.contains('arrow-icon'))) {
        handleTimestampClick(url, target);  
      }
    }}  >
      <div className="editor-header">
      <h> {youtubeTitle && `- ${youtubeTitle}`}</h>
      <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          id="image-upload-input" 
          style={{ display: 'none' }} 
        /> 

      </div>

      <div className="editor-container">
        {editor && (
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bubble-menu">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>
              <strong>B</strong>
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>
              <em>I</em>
            </button>
            <button onClick={toggleImage}>
  📷 {imageInserted ? 'Undo' : 'Insert Image'}
</button>

          </BubbleMenu>
        )}
        <div className="options">
          <div className="three-dots" onClick={(e) => e.stopPropagation()}>
            &#8230;
            <div className="dropdown-content">
              <button onClick={onCopy}>Copy</button>
              <button onClick={onDelete}>Delete</button>
            </div>
          </div>
        </div>
        <EditorContent
          editor={editor}
          className="editor-content"
        /> 
        
        <button onClick={toggleDetails} className="toggle-details-button">
        {showDetails ? <FaEyeSlash /> : <FaEye />}
      </button>
      

      {showDetails && (
        <div className="details">
     <p><strong>Created On:</strong> {createdOn}</p> 
     <p><strong>Last Modified:</strong> {lastModified}</p>
     
        </div>
      )}
      {showDropdown && (
        <div 
          className="timestamp-dropdown" 
          style={{ top: showDropdown.top, left: showDropdown.left }}
        >
          <button onClick={() => handleSeekVideo(showDropdown.url)}>Seek Video</button>
          <button onClick={() => handleOpenInNewTab(showDropdown.url)}>Open in New Tab</button>
          <button onClick={() => handleCopyURL(showDropdown.url)}>Copy URL</button>
        </div>
      )}

        <div className="count-display">
          {isTyping && (
            <div className={`character-count ${characterCount === limit ? 'character-count--warning' : ''}`}>
              <svg height="20" width="20" viewBox="0 0 20 20">
                <circle r="10" cx="10" cy="10" fill="#e9ecef" />
                <circle
                  r="5"
                  cx="10"
                  cy="10"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${(percentage * 31.4) / 100} 31.4`}
                  transform="rotate(-90) translate(-20)" />
                <circle r="6" cx="10" cy="10" fill="white" />
              </svg>
              {characterCount} / {limit} characters
              <br />
              {wordCount} words
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
