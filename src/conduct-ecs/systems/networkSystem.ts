import { NetworkComponent } from '../components/network';
import { isNetworkedComponent } from '../network';
import { Query, System, SystemParams } from '../system';

export default class NetworkSystem implements System {
  @Query()
  update({ entity, world }: SystemParams, _: NetworkComponent) {
    const components = world.getAllComponentsForEntity(entity);
    const networkedComponents = components.filter(isNetworkedComponent);

    //
    console.log(networkedComponents);
  }
}
