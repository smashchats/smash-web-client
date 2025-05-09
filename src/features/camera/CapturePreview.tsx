interface Props {
    imageUrl: string;
}

export default function CapturePreview({ imageUrl }: Readonly<Props>) {
    return (
        <div style={styles.container}>
            <img src={imageUrl} style={styles.image} alt="Captured" />
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
    },
};
