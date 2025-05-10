import ScreenWrapper from '../../components/ScreenWrapper';
import './ProfileScreen.css';
import { AccountSection } from './components/AccountSection';
import { DidDocumentSection } from './components/DidDocumentSection';
import { ProfileSettings } from './components/ProfileSettings';
import { SmeConfiguration } from './components/SmeConfiguration';

export default function ProfileScreen() {
    return (
        <ScreenWrapper title="Profile" backArrow>
            <div className="settings-container">
                <DidDocumentSection />
                <ProfileSettings />
                <SmeConfiguration />
                <AccountSection />
            </div>
        </ScreenWrapper>
    );
}
