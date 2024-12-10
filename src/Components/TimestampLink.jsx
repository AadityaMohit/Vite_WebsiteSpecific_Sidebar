 
import { Node, mergeAttributes } from '@tiptap/core';
 
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
      mergeAttributes(HTMLAttributes, { class: 'timestamp-button' }),
      HTMLAttributes.time,   
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

export default TimestampLink;
