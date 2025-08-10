import { useCallback, useEffect, useState } from 'react';

import { logger } from '../../../utils/logger';

export interface DevicePermissions {
    camera: PermissionState | null;
    microphone: PermissionState | null;
    hasCamera: boolean;
    hasMicrophone: boolean;
}

export interface DevicePermissionsResult {
    permissions: DevicePermissions;
    requestCameraPermission: () => Promise<boolean>;
    requestMicrophonePermission: () => Promise<boolean>;
    requestBothPermissions: () => Promise<{
        camera: boolean;
        microphone: boolean;
    }>;
    refreshPermissions: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export function useDevicePermissions(): DevicePermissionsResult {
    const [permissions, setPermissions] = useState<DevicePermissions>({
        camera: null,
        microphone: null,
        hasCamera: false,
        hasMicrophone: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkDeviceAvailability = useCallback(async (): Promise<{
        hasCamera: boolean;
        hasMicrophone: boolean;
    }> => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(
                (device) => device.kind === 'videoinput',
            );
            const hasMicrophone = devices.some(
                (device) => device.kind === 'audioinput',
            );
            return { hasCamera, hasMicrophone };
        } catch (err) {
            logger.error('Failed to enumerate devices', { error: err });
            return { hasCamera: false, hasMicrophone: false };
        }
    }, []);

    const checkPermissions = useCallback(async (): Promise<{
        camera: PermissionState | null;
        microphone: PermissionState | null;
    }> => {
        try {
            if (!navigator.permissions) {
                return { camera: null, microphone: null };
            }

            const [cameraPermission, microphonePermission] = await Promise.all([
                navigator.permissions.query({
                    name: 'camera' as PermissionName,
                }),
                navigator.permissions.query({
                    name: 'microphone' as PermissionName,
                }),
            ]);

            return {
                camera: cameraPermission.state,
                microphone: microphonePermission.state,
            };
        } catch (err) {
            logger.warn('Failed to query permissions', { error: err });
            return { camera: null, microphone: null };
        }
    }, []);

    const refreshPermissions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [deviceAvailability, permissionStates] = await Promise.all([
                checkDeviceAvailability(),
                checkPermissions(),
            ]);

            setPermissions({
                ...deviceAvailability,
                ...permissionStates,
            });
        } catch (err) {
            const errorMessage = 'Failed to refresh permissions';
            logger.error(errorMessage, { error: err });
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [checkDeviceAvailability, checkPermissions]);

    const requestCameraPermission = useCallback(async (): Promise<boolean> => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            // Clean up the stream immediately
            stream.getTracks().forEach((track) => track.stop());
            await refreshPermissions();
            return true;
        } catch (err) {
            logger.error('Camera permission denied', { error: err });
            setError('Camera permission denied');
            return false;
        }
    }, [refreshPermissions]);

    const requestMicrophonePermission =
        useCallback(async (): Promise<boolean> => {
            try {
                setError(null);
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                // Clean up the stream immediately
                stream.getTracks().forEach((track) => track.stop());
                await refreshPermissions();
                return true;
            } catch (err) {
                logger.error('Microphone permission denied', { error: err });
                setError('Microphone permission denied');
                return false;
            }
        }, [refreshPermissions]);

    const requestBothPermissions = useCallback(async (): Promise<{
        camera: boolean;
        microphone: boolean;
    }> => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            // Clean up the stream immediately
            stream.getTracks().forEach((track) => track.stop());
            await refreshPermissions();
            return { camera: true, microphone: true };
        } catch (err) {
            logger.error('Media permissions denied', { error: err });
            setError('Media permissions denied');
            // Try individual permissions as fallback
            const [camera, microphone] = await Promise.all([
                requestCameraPermission(),
                requestMicrophonePermission(),
            ]);
            return { camera, microphone };
        }
    }, [
        refreshPermissions,
        requestCameraPermission,
        requestMicrophonePermission,
    ]);

    // Initial permissions check
    useEffect(() => {
        refreshPermissions();
    }, [refreshPermissions]);

    return {
        permissions,
        requestCameraPermission,
        requestMicrophonePermission,
        requestBothPermissions,
        refreshPermissions,
        isLoading,
        error,
    };
}
