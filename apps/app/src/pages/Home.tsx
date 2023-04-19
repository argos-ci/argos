// import { useEffect } from "react";

// import config from "@/config";
// import { Query } from "@/containers/Apollo";
// import { useIsLoggedIn } from "@/containers/Auth";
// import { ProjectList } from "@/containers/ProjectList";
// import { DocumentType, graphql } from "@/gql";
// import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
// import { Button } from "@/ui/Button";
// import { Container } from "@/ui/Container";
// import { PageLoader } from "@/ui/PageLoader";

// const MeQuery = graphql(`
//   query Home_me {
//     me {
//       accounts {
//         id
//         projects(first: 100, after: 0) {
//           id
//           ...ProjectList_Project
//         }
//       }
//     }
//   }
// `);

// type MeQueryDocument = DocumentType<typeof MeQuery>;

// function Owners(props: { accounts: MeQueryDocument["me"]["accounts"] }) {
//   const projects = props.accounts.flatMap((account) =>
//     account.projects.edges.map((project) => project)
//   );

//   if (!projects.length) {
//     return (
//       <Container>
//         <Alert>
//           <AlertTitle>No Project found</AlertTitle>
//           <AlertText>Adds your first Project to start using Argos.</AlertText>
//           <AlertActions>
//             <Button>
//               {(buttonProps) => (
//                 <a {...buttonProps} href={config.get("github.appUrl")}>
//                   Give access to your projects
//                 </a>
//               )}
//             </Button>
//           </AlertActions>
//         </Alert>
//       </Container>
//     );
//   }

//   return (
//     <Container>
//       <ProjectList projects={projects} />
//     </Container>
//   );
// }

// const RedirectToWww = () => {
//   useEffect(() => {
//     window.location.replace("https://www.argos-ci.com");
//   }, []);
//   return null;
// };

// export const Home = () => {
//   const loggedIn = useIsLoggedIn();

//   if (!loggedIn) {
//     if (process.env["NODE_ENV"] !== "production") {
//       return (
//         <div className="container mx-auto p-4 text-center">
//           Not logged in, in production you would be redirected to
//           www.argos-ci.com.
//         </div>
//       );
//     }
//     return <RedirectToWww />;
//   }

//   return (
//     <Query fallback={<PageLoader />} query={OwnersQuery}>
//       {({ accounts }) => <Owners accounts={accounts} />}
//     </Query>
//   );
// };

export const Home = () => {
  return <div>Hello World</div>;
};
