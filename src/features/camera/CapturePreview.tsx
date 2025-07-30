interface Props {
    imageUrl: string;
}

export default function CapturePreview({ imageUrl }: Readonly<Props>) {
    return (
        <div style={styles.container}>
            <img src={imageUrl} alt="Captured" style={styles.image} />
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 20,
        backgroundColor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column' as const,
        overflow: 'hidden',
        pointerEvents: 'auto' as const,
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        position: 'absolute' as const,
        top: 0,
        left: 0,
        zIndex: 1,
        // Desktop responsive styles applied conditionally
        ...(window.innerWidth >= 768 && {
            maxWidth: '480px',
            maxHeight: '640px',
            width: 'auto',
            height: 'auto',
            aspectRatio: '3/4',
            borderRadius: '24px',
            position: 'relative' as const,
            boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }),
        ...(window.innerWidth >= 1024 && {
            maxWidth: '520px',
            maxHeight: '700px',
        }),
    },
};
