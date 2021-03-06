import {AndroidVariant, PushApplication, UnifiedPushAdminClient} from '../src';
import {KeycloakCredentials} from '../src/UnifiedPushAdminClient';
import {UPSMock} from './mocks';
import {utils} from './mocks';
import {KEYCLOAK_URL, KC_CREDENTIALS} from './mocks/rest/keycloak';

const BASE_URL = 'http://localhost:8888';

const upsMock = new UPSMock(true);

beforeEach(() => {
  upsMock.reset();
});

afterAll(() => {
  upsMock.uninstall();
});

describe('UnifiedPushAdminClient', () => {
  const credentials: KeycloakCredentials = {
    kcUrl: KEYCLOAK_URL,
    ...KC_CREDENTIALS,
    type: 'keycloak',
  };
  const NEW_APP_NAME = 'Test Application 1';

  it('Should return all apps', async () => {
    utils.generateApps(upsMock, 10);
    const apps = await new UnifiedPushAdminClient(BASE_URL, credentials).applications.find();
    expect(apps.appList).toHaveLength(10);
  });

  it('Should rename an app', async () => {
    const IDS = utils.generateApps(upsMock, 59);
    const appId = IDS[52];
    upsMock.getImpl().getApplications(appId);

    const newName = 'NEW APP NAME';

    expect(
      (await new UnifiedPushAdminClient(BASE_URL, credentials).applications.find({filter: {pushApplicationID: appId}}))
        .appList[0].name
    ).not.toEqual(newName);

    await new UnifiedPushAdminClient(BASE_URL, credentials).applications.rename(appId, newName);
    expect(
      (await new UnifiedPushAdminClient(BASE_URL, credentials).applications.find({filter: {pushApplicationID: appId}}))
        .appList[0].name
    ).toEqual(newName);
  });

  it('Should create app', async () => {
    const app = await new UnifiedPushAdminClient(BASE_URL, credentials).applications.create(NEW_APP_NAME);
    expect(app.name).toEqual(NEW_APP_NAME);
  });

  it('Should delete an app by name', async () => {
    const IDS = utils.generateApps(upsMock, 59);
    const appId = IDS[52];
    const appToDelete = upsMock.getImpl().getApplications(appId) as PushApplication;

    const ups = new UnifiedPushAdminClient(BASE_URL, credentials);
    const app = await ups.applications.find({filter: {name: appToDelete.name}});
    expect(app.appList).toHaveLength(1);
    const deletedApp = await ups.applications.delete({name: appToDelete.name});
    expect(deletedApp).toMatchObject([appToDelete]);
    expect((await ups.applications.find({filter: {name: appToDelete.name}})).appList).toHaveLength(0);
  });

  // VARIANTS TEST

  it('Should find all variants', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];
    const createdVariants = utils.generateVariants(upsMock, appId, 3);

    const variants = await new UnifiedPushAdminClient(BASE_URL, credentials).variants.find(appId);
    expect(variants).toEqual(createdVariants);
  });

  it('Should create an android variant', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];

    const variant = await new UnifiedPushAdminClient(BASE_URL, credentials).variants.create(appId, {
      type: 'android',
      projectNumber: '12345',
      googleKey: '34645654',
      name: 'My beautiful variant',
    } as AndroidVariant);
    expect(variant).toMatchObject({
      type: 'android',
      projectNumber: '12345',
      googleKey: '34645654',
      name: 'My beautiful variant',
    });
  });
  it('Should delete a variant', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];
    const variants = utils.generateVariants(upsMock, appId, 30);

    const variantToDelete = variants[15];

    const variantsBefore = await new UnifiedPushAdminClient(BASE_URL, credentials).variants.find(appId, {
      variantID: variantToDelete.variantID,
    });
    expect(variantsBefore).toBeDefined();
    expect(variantsBefore).toHaveLength(1);
    await new UnifiedPushAdminClient(BASE_URL, credentials).variants.delete(appId, {
      variantID: variantToDelete.variantID,
    });
    const variantsAfter = await new UnifiedPushAdminClient(BASE_URL, credentials).variants.find(appId, {
      variantID: variantToDelete.variantID,
    });
    expect(variantsAfter).toBeDefined();
    expect(variantsAfter).toHaveLength(0);
  });

  it('Should renew a variant secret', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];
    const variants = utils.generateVariants(upsMock, appId, 30);

    const variantToRenew = variants[15];

    const oldSecret = variantToRenew.secret;

    const renewedVariant = await new UnifiedPushAdminClient(BASE_URL, credentials).variants.renewSecret(
      appId,
      variantToRenew.type,
      variantToRenew.variantID!
    );
    expect(renewedVariant.secret).toBeDefined();
    expect(renewedVariant.secret).not.toEqual(oldSecret);
  });

  it('Should update a variant name', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];
    const variants = utils.generateVariants(upsMock, appId, 30);

    const variantToRenew = variants[15];
    const newName = 'new name';

    await new UnifiedPushAdminClient(BASE_URL, credentials).variants.update(appId, {
      variantID: variantToRenew.variantID!,
      type: variantToRenew.type,
      name: newName,
    });

    const updatedVariant = (
      await new UnifiedPushAdminClient(BASE_URL, credentials).variants.find(appId, {
        variantID: variantToRenew.variantID,
      })
    )[0];

    expect(updatedVariant.name).toEqual(newName);
  });

  it('Should renew a 404', async () => {
    const APP_IDS = utils.generateApps(upsMock, 10);
    const appId = APP_IDS[5];
    utils.generateVariants(upsMock, appId, 30);

    await expect(
      new UnifiedPushAdminClient(BASE_URL, credentials).variants.renewSecret(appId, 'android', 'bad id')
    ).rejects.toThrow('Could not find requested Variant');
  });
});
