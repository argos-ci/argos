import React from 'react';
import { Link } from 'react-router';

function Repository() {
  return (
    <div>
      <h2>{'Repository'}</h2>
      <Link to="/argos-ci/argos/builds/1">
        {'build 1'}
      </Link>
      <br />
      <Link to="/argos-ci/argos/settings">
        {'Settings'}
      </Link>
    </div>
  );
}

export default Repository;
