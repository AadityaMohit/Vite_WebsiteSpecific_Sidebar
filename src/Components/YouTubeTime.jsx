 
import React, { useState, useEffect } from 'react';

function YouTubeTime({ setCurrentTime, setDuration }) {
  const [currentTime, localSetCurrentTime] = useState('0:00');
  const [duration, localSetDuration] = useState('0:00');

  useEffect(() => {
    const fetchCurrentTime = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('youtube.com/watch')) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tabs[0].id },
              function: () => {
                const currentTimeElement = document.querySelector('.ytp-time-current');
                const durationElement = document.querySelector('.ytp-time-duration');
                return {
                  currentTime: currentTimeElement ? currentTimeElement.innerHTML : '0:00',
                  duration: durationElement ? durationElement.innerHTML : '0:00',
                };
              },
            },
            (results) => {
              if (results && results[0]?.result) {
                const { currentTime, duration } = results[0].result;
                localSetCurrentTime(currentTime);
                localSetDuration(duration);
                setCurrentTime(currentTime);
                setDuration(duration);
              }
            }
          );
        }
      });
    };

    const intervalId = setInterval(fetchCurrentTime, 1000);
    return () => clearInterval(intervalId);
  }, [setCurrentTime, setDuration]);

  return (
    <div>
      <p>
        Current Time: <b>{currentTime}</b> | Duration: <b>{duration}</b>
      </p>
    </div>
  );
}

export default YouTubeTime;
