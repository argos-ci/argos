import React from 'react';
import { Link } from 'react-router';

function Profile() {
  return (
    <div>
      <h2>Profile</h2>
      <Link to="/profile/2">
        argos-ci
      </Link>
      <br />
      <Link to="/argos-ci/argos">
        argos-ci/argos
      </Link>
    </div>
  );
}

export default Profile;
