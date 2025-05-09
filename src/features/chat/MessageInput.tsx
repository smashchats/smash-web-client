import { useState } from 'react';

export default function MessageInput({
    onSend,
}: {
    onSend: (text: string) => void;
}) {
    const [text, setText] = useState('');

    return (
        <div
            style={{ padding: 8, borderTop: '1px solid #ddd', display: 'flex' }}
        >
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ flex: 1, padding: 8 }}
                placeholder="Type a message"
            />
            <button
                onClick={() => {
                    onSend(text);
                    setText('');
                }}
            >
                Send
            </button>
        </div>
    );
}
