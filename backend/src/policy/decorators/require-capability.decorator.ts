import { SetMetadata } from '@nestjs/common';
import { Capability } from '../policy.types';

export const CAPABILITIES_KEY = 'required_capabilities';
export const RequireCapability = (...capabilities: Capability[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilities);
