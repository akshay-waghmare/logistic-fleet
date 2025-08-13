import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, getProperties } from '@ember/object';
import OnboardValidations from '../../validations/onboard';
import lookupValidator from 'ember-changeset-validations';
import Changeset from 'ember-changeset';

export default class OnboardIndexController extends Controller {
    /**
     * Inject the `fetch` service
     *
     * @memberof OnboardIndexController
     */
    @service fetch;

    /**
     * Inject the `session` service
     *
     * @memberof OnboardIndexController
     */
    @service session;

    /**
     * Inject the `router` service
     *
     * @memberof OnboardIndexController
     */
    @service router;

    /**
     * Inject the `notifications` service
     *
     * @memberof OnboardIndexController
     */
    @service notifications;

    /**
     * The name input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked name;

    /**
     * The email input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked email;

    /**
     * The phone input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked phone;

    /**
     * The organization_name input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked organization_name;

    /**
     * The password input field.
     *
     * @memberof OnboardIndexController
     */
    @tracked password;

    /**
     * The name password confirmation field.
     *
     * @memberof OnboardIndexController
     */
    @tracked password_confirmation;

    /**
     * The property for error message.
     *
     * @memberof OnboardIndexController
     */
    @tracked error;

    /**
     * The loading state of the onboard request.
     *
     * @memberof OnboardIndexController
     */
    @tracked isLoading = false;

    /**
     * The ready state for the form.
     *
     * @memberof OnboardIndexController
     */
    @tracked readyToSubmit = false;

    /**
     * Start the onboard process.
     *
     * @return {Promise}
     * @memberof OnboardIndexController
     */
    @action async startOnboard(event) {
        event.preventDefault();

        // eslint-disable-next-line ember/no-get
        const input = getProperties(this, 'name', 'email', 'phone', 'organization_name', 'password', 'password_confirmation');
        const changeset = new Changeset(input, lookupValidator(OnboardValidations), OnboardValidations);

        await changeset.validate();

        if (changeset.get('isInvalid')) {
            const errorMessage = changeset.errors.firstObject.validation.firstObject;

            this.notifications.error(errorMessage);
            return;
        }

        // Set user timezone
        input.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Request to skip verification for onboarding
        input.skip_verification = true;

        this.isLoading = true;

        return this.fetch
            .post('onboard/create-account', input)
            .then(({ status, skipVerification, token, session }) => {
                console.log('Onboard response:', { status, skipVerification, token, session });
                
                if (status === 'success') {
                    console.log('Status is success, skipVerification:', skipVerification, 'type:', typeof skipVerification);
                    
                    if (skipVerification === true) {
                        console.log('Skip verification is true, proceeding to authenticate');
                        // Skip verification during onboarding flow
                        if (token) {
                            console.log('Token provided, authenticating with token:', token);
                            // If token provided, authenticate immediately
                            this.session.isOnboarding().manuallyAuthenticate(token);
                        } else {
                            console.log('No token, authenticating with session:', session);
                            // If no token, create a temporary auth session with the session ID
                            this.session.isOnboarding().manuallyAuthenticate(session);
                        }

                        return this.router.transitionTo('console').then(() => {
                            this.notifications.success('Welcome to Fleetbase!');
                        });
                    } else {
                        console.log('Skip verification is NOT true, redirecting to verification page');
                    }

                    return this.router.transitionTo('onboard.verify-email', { queryParams: { hello: session } });
                }
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
